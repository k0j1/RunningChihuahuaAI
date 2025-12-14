
import { useState } from 'react';
import { BossType } from '../types';

export const useBossSystem = () => {
  const [bossType, setBossType] = useState<BossType>(BossType.GORILLA);
  const [bossLevel, setBossLevel] = useState(1);
  const [bossHits, setBossHits] = useState(0);
  const [isBossDefeated, setIsBossDefeated] = useState(false);
  const [isBossHit, setIsBossHit] = useState(false);

  const resetBoss = () => {
    setBossType(BossType.GORILLA);
    setBossLevel(1);
    setBossHits(0);
    setIsBossDefeated(false);
    setIsBossHit(false);
  };

  const registerHit = () => {
    setIsBossHit(true);
    setTimeout(() => setIsBossHit(false), 1000);
    const newHits = bossHits + 1;
    setBossHits(newHits);
    return newHits;
  };

  const defeatBoss = () => {
    setIsBossDefeated(true);
    
    setTimeout(() => {
      // Level Up / Type Switch Logic
      if (bossLevel >= 2) {
          if (bossType === BossType.GORILLA) setBossType(BossType.CHEETAH);
          else if (bossType === BossType.CHEETAH) setBossType(BossType.DRAGON);
          setBossLevel(1);
      } else {
          setBossLevel(prev => prev + 1);
      }
      setBossHits(0);
      setIsBossDefeated(false);
    }, 3000);
  };

  return {
    bossType, bossLevel, bossHits, 
    isBossDefeated, isBossHit,
    resetBoss, registerHit, defeatBoss
  };
};
