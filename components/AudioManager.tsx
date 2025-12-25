import React, { useEffect, useRef } from 'react';
import { GameState } from '../types';

interface AudioManagerProps {
  gameState: GameState;
  isMuted: boolean;
  combo: number;
  isBossHit: boolean;
  isCelebrating: boolean;
}

export const AudioManager: React.FC<AudioManagerProps> = ({ 
  gameState, 
  isMuted, 
  combo, 
  isBossHit, 
  isCelebrating 
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentNoteIndexRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // State tracking for SFX triggers
  const prevComboRef = useRef<number>(0);
  const prevBossHitRef = useRef<boolean>(false);
  const prevCelebratingRef = useRef<boolean>(false);
  const hasPlayedClearRef = useRef<boolean>(false);

  // Music Sequence Data
  const TEMPO = 160;
  const SECONDS_PER_BEAT = 60.0 / TEMPO;
  const NOTE_LENGTH = SECONDS_PER_BEAT / 4; // 16th notes
  const LOOKAHEAD = 25.0; // ms
  const SCHEDULE_AHEAD_TIME = 0.1; // s

  // Frequencies
  const F = {
    A2: 110.00, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, 
    A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, 
    G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, 
    F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50, E6: 1318.51, G6: 1567.98
  };

  const BASS_PATTERN = [
    F.A2, F.A2, F.A2, F.A2, F.C3, F.C3, F.C3, F.C3, 
    F.F3, F.F3, F.F3, F.F3, F.G3, F.G3, F.G3, F.G3, 
  ];

  const LEAD_PATTERN = [
    F.A4, F.C5, F.E5, F.A5, F.E5, F.C5, F.A4, F.C5,
    F.E5, F.A5, F.C6, F.B5, F.A5, F.E5, F.C5, F.A4,
    F.F4, F.A4, F.C5, F.F5, F.C5, F.A4, F.F4, F.A4,
    F.G4, F.B4, F.D5, F.G5, F.B5, F.G5, F.D5, F.B4
  ];

  // Initialize AudioContext
  useEffect(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // --- BGM Scheduler ---
  useEffect(() => {
    if (gameState === GameState.RUNNING && !isMuted) {
      hasPlayedClearRef.current = false; // Reset clear flag on new run
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        currentNoteIndexRef.current = 0;
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        if (audioCtxRef.current) {
            nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
            timerIDRef.current = window.setInterval(scheduler, LOOKAHEAD);
        }
      }
    } else {
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        if (timerIDRef.current) {
          window.clearInterval(timerIDRef.current);
          timerIDRef.current = null;
        }
      }
    }
  }, [gameState, isMuted]);

  // --- SFX Triggers ---
  useEffect(() => {
    if (!audioCtxRef.current || isMuted) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // 1. Dodge Success (Combo Increase)
    if (combo > prevComboRef.current && combo > 0) {
      playDodgeSFX(ctx);
    }
    prevComboRef.current = combo;

    // 2. Boss Hit
    if (isBossHit && !prevBossHitRef.current) {
      playBossHitSFX(ctx);
    }
    prevBossHitRef.current = isBossHit;

    // 3. Celebration (Level Clear / Boss Defeat Jingle)
    if (isCelebrating && !prevCelebratingRef.current && gameState !== GameState.GAME_CLEAR) {
      playCelebrationSFX(ctx);
    }
    prevCelebratingRef.current = isCelebrating;

    // 4. Game Clear Fanfare
    if (gameState === GameState.GAME_CLEAR && !hasPlayedClearRef.current) {
       hasPlayedClearRef.current = true;
       playGameClearFanfare(ctx);
    }

  }, [combo, isBossHit, isCelebrating, gameState, isMuted]);

  // --- BGM Logic ---
  const scheduler = () => {
    if (!audioCtxRef.current) return;
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleNote(currentNoteIndexRef.current, nextNoteTimeRef.current);
      nextStep();
    }
  };

  const nextStep = () => {
    nextNoteTimeRef.current += NOTE_LENGTH;
    currentNoteIndexRef.current++;
    if (currentNoteIndexRef.current >= 32) {
        currentNoteIndexRef.current = 0;
    }
  };

  const scheduleNote = (beatIndex: number, time: number) => {
    if (isMuted || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);

    // Bass
    let bassFreq = 0;
    if (beatIndex < 16) bassFreq = BASS_PATTERN[beatIndex]; 
    else bassFreq = BASS_PATTERN[beatIndex % 16];
    
    if (beatIndex % 2 === 0 && bassFreq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = bassFreq;
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + NOTE_LENGTH * 2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + NOTE_LENGTH * 2);
    }

    // Lead
    const leadFreq = LEAD_PATTERN[beatIndex % 32];
    if (leadFreq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = leadFreq;
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + NOTE_LENGTH * 0.9);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + NOTE_LENGTH);
    }

    // Drums
    const stepInBar = beatIndex % 16;
    if (stepInBar === 0 || stepInBar === 8 || stepInBar === 10) playDrum(ctx, masterGain, time, 'kick');
    if (stepInBar === 4 || stepInBar === 12) playDrum(ctx, masterGain, time, 'snare');
    if (beatIndex % 2 === 0) playDrum(ctx, masterGain, time, 'hihat');
  };

  const playDrum = (ctx: AudioContext, output: AudioNode, time: number, type: 'kick' | 'snare' | 'hihat') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      if (type === 'kick') {
          osc.frequency.setValueAtTime(150, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
          osc.connect(gain);
      } else if (type === 'snare') {
          const bufferSize = ctx.sampleRate * 0.1;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 1000;
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
          noise.connect(filter);
          filter.connect(gain);
          noise.start(time);
          gain.connect(output);
          return;
      } else { 
          const bufferSize = ctx.sampleRate * 0.05;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 5000;
          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
          noise.connect(filter);
          filter.connect(gain);
          noise.start(time);
          gain.connect(output);
          return;
      }
      osc.connect(gain);
      gain.connect(output);
      osc.start(time);
      osc.stop(time + 0.1);
  };

  // --- SFX Functions ---

  const playDodgeSFX = (ctx: AudioContext) => {
    // Upward pitch slide (Coin/Jump style)
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.1);
  };

  const playBossHitSFX = (ctx: AudioContext) => {
    // Impact noise + low thud
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    noise.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(t);

    // Low Thud
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  };

  const playCelebrationSFX = (ctx: AudioContext) => {
    // Quick Arpeggio (Level Clear / Victory Dance)
    const t = ctx.currentTime;
    const notes = [F.C5, F.E5, F.G5, F.C6];
    const duration = 0.08;
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        
        const startTime = t + i * duration;
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
    });
  };

  const playGameClearFanfare = (ctx: AudioContext) => {
    // Grand Finale Fanfare
    // C G C E G C (sustained)
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);

    const playNote = (freq: number, start: number, dur: number, type: OscillatorType = 'square') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        
        const st = t + start;
        gain.gain.setValueAtTime(0.2, st);
        gain.gain.setValueAtTime(0.2, st + dur * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.01, st + dur);
        
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(st);
        osc.stop(st + dur);
    };

    // Fanfare Sequence
    playNote(F.C4, 0.0, 0.2);
    playNote(F.G4, 0.2, 0.2);
    playNote(F.C5, 0.4, 0.2);
    playNote(F.E5, 0.6, 0.2);
    playNote(F.G5, 0.8, 0.4);
    
    // Final Chord
    setTimeout(() => {
        playNote(F.C4, 1.2, 2.0, 'triangle'); // Bass
        playNote(F.E5, 1.2, 2.0);
        playNote(F.G5, 1.2, 2.0);
        playNote(F.C6, 1.2, 2.0);
    }, 0);
  };

  return null;
};