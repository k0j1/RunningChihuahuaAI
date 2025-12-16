
import { useState, useRef } from 'react';
import { DodgeType, GameState } from '../types';

export const usePlayerSystem = () => {
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [isHit, setIsHit] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  
  // Actions
  const [isDodging, setIsDodging] = useState(false);
  const [dodgeType, setDodgeType] = useState<DodgeType>(DodgeType.SIDESTEP);
  const [isDodgeQueued, setIsDodgeQueued] = useState(false);
  const [isDuckQueued, setIsDuckQueued] = useState(false);
  const [dodgeCutIn, setDodgeCutIn] = useState<{id: number, text: string, x: number, y: number} | null>(null);
  
  // Logic Refs
  const isDodgedRef = useRef(false);
  const isDuckedRef = useRef(false);
  const comboRef = useRef(0); // Ref to track combo synchronously
  const cutInTimeoutRef = useRef<number | null>(null);

  const resetPlayer = () => {
    setLives(3);
    setCombo(0);
    comboRef.current = 0;
    setIsHit(false);
    setIsCelebrating(false);
    setIsDodging(false);
    setIsDodgeQueued(false);
    setIsDuckQueued(false);
    setDodgeCutIn(null);
    isDodgedRef.current = false;
    isDuckedRef.current = false;
  };

  const takeDamage = () => {
    const newLives = lives - 1;
    setLives(newLives);
    setIsHit(true);
    setCombo(0);
    comboRef.current = 0; // Reset combo ref
    setIsCelebrating(false); // Stop celebrating if hit
    setTimeout(() => setIsHit(false), 1500);
    return newLives;
  };

  const heal = (amount: number) => {
    setLives(prev => Math.min(3, prev + amount));
  };

  const performDodge = (obstacleType: any) => {
    if (obstacleType === 'SHEEP') {
      setDodgeType(DodgeType.JUMP);
    } else {
      const types = [DodgeType.SIDESTEP, DodgeType.SIDESTEP, DodgeType.SPIN, DodgeType.JUMP];
      setDodgeType(types[Math.floor(Math.random() * types.length)]);
    }

    isDodgedRef.current = true;
    setIsDodging(true);
    setIsDodgeQueued(false); // Consume queue immediately
    
    // Increment total hits
    comboRef.current += 1;
    
    // Use the raw streak count.
    // 1st hit = 1.
    // 2nd hit = 2.
    // GameHUD checks (combo > 1), so it will display starting from 2nd hit ("x2").
    setCombo(comboRef.current); 
    
    setTimeout(() => {
      setIsDodging(false);
      isDodgedRef.current = false; // Reset immunity after animation
    }, 500);

    return comboRef.current; // Return the up-to-date combo value
  };

  const performDuck = () => {
    setDodgeType(DodgeType.SPIN);
    isDuckedRef.current = true;
    setIsDodging(true);
    setIsDuckQueued(false); // Consume queue immediately
    
    setTimeout(() => {
      setIsDodging(false);
      isDuckedRef.current = false; // Reset immunity after animation
    }, 500);
  };

  const triggerCelebration = () => {
    setIsCelebrating(true);
    setTimeout(() => {
      setIsCelebrating(false);
    }, 4000); // Celebrate for 4 seconds
  };

  const triggerComicCutIn = (x?: number, y?: number) => {
    const comicWords = ["WHOOSH!", "SWISH!", "NICE!", "WOW!", "ZOOM!", "YEAH!", "DODGE!"];
    const word = comicWords[Math.floor(Math.random() * comicWords.length)];
    
    const width = window.innerWidth;
    const height = window.innerHeight;

    let fx = width * 0.8;
    let fy = height * 0.5;

    if (x !== undefined && y !== undefined) {
      const isLeft = x < width / 2;
      fx = isLeft ? width * 0.2 : width * 0.8;
      fy = y;
    } else {
      fx = Math.random() > 0.5 ? width * 0.2 : width * 0.8;
      fy = height * 0.4 + Math.random() * (height * 0.2);
    }
    fy = Math.max(height * 0.2, Math.min(fy, height * 0.8));

    setDodgeCutIn({ id: Date.now(), text: word, x: fx, y: fy });

    if (cutInTimeoutRef.current) clearTimeout(cutInTimeoutRef.current);
    cutInTimeoutRef.current = window.setTimeout(() => {
      setDodgeCutIn(null);
    }, 500); 
  };

  const queueDodge = () => {
      setIsDodgeQueued(true);
      // Do not reset isDodgedRef here to prevent double triggering if spamming during active dodge
  }
  
  const queueDuck = () => {
      setIsDuckQueued(true);
      // Do not reset isDuckedRef here
  }

  const clearQueues = () => {
      setIsDodgeQueued(false);
      setIsDuckQueued(false);
  }

  return {
    lives, combo, isHit, isCelebrating,
    isDodging, dodgeType, isDodgeQueued, isDuckQueued,
    dodgeCutIn, isDodgedRef, isDuckedRef,
    resetPlayer, takeDamage, heal, performDodge, performDuck, triggerCelebration,
    queueDodge, queueDuck, clearQueues, triggerComicCutIn
  };
};
