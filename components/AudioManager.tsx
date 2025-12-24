import React, { useEffect, useRef } from 'react';
import { GameState } from '../types';

interface AudioManagerProps {
  gameState: GameState;
  isMuted: boolean;
}

export const AudioManager: React.FC<AudioManagerProps> = ({ gameState, isMuted }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentNoteIndexRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Music Sequence Data
  // High energy 8-bit style (Famicom Rocky inspiration)
  // 150 BPM
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
    F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50
  };

  // 16-step patterns repeated
  // Pattern A: Am High Energy
  const BASS_PATTERN = [
    F.A2, F.A2, F.A2, F.A2, F.C3, F.C3, F.C3, F.C3, // Am
    F.F3, F.F3, F.F3, F.F3, F.G3, F.G3, F.G3, F.G3, // F -> G
  ];

  const LEAD_PATTERN = [
    // Bar 1 (Am)
    F.A4, F.C5, F.E5, F.A5, F.E5, F.C5, F.A4, F.C5,
    F.E5, F.A5, F.C6, F.B5, F.A5, F.E5, F.C5, F.A4,
    // Bar 2 (F -> G)
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

  // Handle Play/Pause
  useEffect(() => {
    // If playing, but user mutes, we need to stop scheduling but maybe not "stop" the concept of playing?
    // Actually, easier to just pause the scheduler.
    
    if (gameState === GameState.RUNNING && !isMuted) {
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        currentNoteIndexRef.current = 0;
        
        // Resume context if suspended (browser policy)
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        
        if (audioCtxRef.current) {
            nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
            timerIDRef.current = window.setInterval(scheduler, LOOKAHEAD);
        }
      }
    } else {
      // Pause if game not running OR if muted
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        if (timerIDRef.current) {
          window.clearInterval(timerIDRef.current);
          timerIDRef.current = null;
        }
      }
    }
  }, [gameState, isMuted]);

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
    if (currentNoteIndexRef.current >= 32) { // 32 steps in our main loop (2 bars of 16th notes)
        currentNoteIndexRef.current = 0;
    }
  };

  const scheduleNote = (beatIndex: number, time: number) => {
    if (isMuted || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    // --- Master Gain ---
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3; // Overall volume
    masterGain.connect(ctx.destination);

    // --- Bass (Triangle Wave) ---
    // Map 32 step loop to 16 step bass pattern (repeat twice or stretch? let's repeat pattern logic)
    // 0-15: Am, 16-31: F->G
    // Our BASS_PATTERN is 16 steps. 
    // We'll play it twice but transpose strictly if needed, but our pattern array is hardcoded for 16 steps.
    // Let's create a 32-step mapper.
    
    let bassFreq = 0;
    if (beatIndex < 16) {
       // First 16 steps (Am)
       // Bass pattern index 0-15
       bassFreq = BASS_PATTERN[beatIndex]; 
    } else {
       // Steps 16-31
       // We want F -> G pattern again? No, BASS_PATTERN has 16 steps total.
       // Let's reuse BASS_PATTERN for the second half?
       // Wait, BASS_PATTERN defined above is 16 steps (8 Am, 4 F, 4 G).
       // We need 32 steps. 
       // Let's just loop the BASS_PATTERN (index % 16)
       bassFreq = BASS_PATTERN[beatIndex % 16];
    }
    
    // Only play bass on 8th notes (every even beat index)
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

    // --- Lead (Square Wave - NES Style) ---
    const leadFreq = LEAD_PATTERN[beatIndex % 32];
    if (leadFreq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = leadFreq;
        
        // Envelope: Short pluck
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + NOTE_LENGTH * 0.9);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + NOTE_LENGTH);
    }

    // --- Drums (Noise) ---
    // Kick on 1, Snare on 3 (Standard Rock Beat)
    // 16th note counting: 
    // Kick: 0, 8, 16, 24
    // Snare: 4, 12, 20, 28
    // HiHat: Every 2 steps (0, 2, 4...)
    
    const stepInBar = beatIndex % 16;
    
    // Kick
    if (stepInBar === 0 || stepInBar === 8 || stepInBar === 10) {
        playDrum(ctx, masterGain, time, 'kick');
    }
    // Snare
    if (stepInBar === 4 || stepInBar === 12) {
        playDrum(ctx, masterGain, time, 'snare');
    }
    // Hi-hat
    if (beatIndex % 2 === 0) {
       playDrum(ctx, masterGain, time, 'hihat');
    }
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
          // Noise buffer for snare
          const bufferSize = ctx.sampleRate * 0.1; // 0.1s noise
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          // Bandpass filter to make it crisp
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
      } else { // Hihat
          // Higher freq noise
          const bufferSize = ctx.sampleRate * 0.05;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }
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

  return null; // This component produces sound, not UI
};