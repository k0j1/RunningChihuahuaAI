
import { useState, useRef } from 'react';
import { ProjectileType, BossType } from '../types';

export const useProjectileSystem = () => {
  const [projectileActive, setProjectileActive] = useState(false);
  // Removed state, using Ref for 60fps animation
  const projectileProgressRef = useRef(0);
  const [projectileType, setProjectileType] = useState<ProjectileType>(ProjectileType.BARREL);
  const [projectileStartZ, setProjectileStartZ] = useState(8);
  
  // Refs
  const projectileActiveRef = useRef(false);
  const timeSinceLastProjectile = useRef(0);
  const nextProjectileTime = useRef(5);
  const isThrowingRef = useRef(false);

  const resetProjectiles = () => {
    setProjectileActive(false);
    projectileActiveRef.current = false;
    projectileProgressRef.current = 0;
    isThrowingRef.current = false;
    timeSinceLastProjectile.current = 0;
    nextProjectileTime.current = 5 + Math.random() * 5;
  };

  const triggerThrow = (lives: number, bossType: BossType) => {
     isThrowingRef.current = true;
     
     // Delay actual projectile spawn to match animation
     setTimeout(() => {
        const currentBossZ = Math.min(16, Math.max(0, (lives / 3) * 16));
        setProjectileStartZ(currentBossZ);
        setProjectileActive(true);
        projectileActiveRef.current = true;
        projectileProgressRef.current = 0;
        isThrowingRef.current = false;
        
        let pType = ProjectileType.BARREL;
        const rand = Math.random();
        if (bossType === BossType.GORILLA) pType = rand > 0.5 ? ProjectileType.BARREL : ProjectileType.BANANA;
        else if (bossType === BossType.CHEETAH) pType = rand > 0.5 ? ProjectileType.BONE : ProjectileType.ROCK;
        else if (bossType === BossType.DRAGON) pType = ProjectileType.FIREBALL;
        setProjectileType(pType);
    }, 500);

    timeSinceLastProjectile.current = 0;
    nextProjectileTime.current = 4 + Math.random() * 4;
  };

  const updateProjectile = (delta: number, speed: number, bossLevel: number) => {
    if (projectileActiveRef.current) {
        const levelMultiplier = 5 + (bossLevel - 1) * 2;
        const flySpeed = (speed * delta * levelMultiplier) / Math.max(projectileStartZ, 1); 
        const newProgress = projectileProgressRef.current + flySpeed;
        projectileProgressRef.current = newProgress;
        
        if (newProgress >= 1) {
            setProjectileActive(false);
            projectileActiveRef.current = false;
            projectileProgressRef.current = 0;
            return { active: false, progress: 1, finished: true };
        }
        return { active: true, progress: newProgress };
    } 
    return { active: false, progress: 0 };
  };

  const checkSpawn = (delta: number) => {
      if (!projectileActiveRef.current && !isThrowingRef.current) {
         timeSinceLastProjectile.current += delta;
         if (timeSinceLastProjectile.current > nextProjectileTime.current) {
             return true;
         }
      }
      return false;
  };

  // Helper setter
  const setProjectileProgress = (val: number) => {
    projectileProgressRef.current = val;
  }

  return {
    projectileActive, projectileActiveRef, projectileProgressRef, projectileType, projectileStartZ, isThrowingRef,
    setProjectileProgress, setProjectileActive,
    resetProjectiles, checkSpawn, triggerThrow, updateProjectile
  };
};
