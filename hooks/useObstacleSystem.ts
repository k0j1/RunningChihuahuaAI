
import { useState, useRef } from 'react';
import { ObstacleType } from '../types';

export const useObstacleSystem = () => {
  const [hazardActive, setHazardActive] = useState(false);
  // Removed state for progress, using Ref for performance (animation loop)
  const obstacleProgressRef = useRef(0); 
  const [obstacleType, setObstacleType] = useState<ObstacleType>(ObstacleType.ROCK);
  const [hazardPosition, setHazardPosition] = useState({ top: '50%', left: '50%' });

  // Refs for loop logic
  const hazardActiveRef = useRef(false);
  const timeSinceLastObstacle = useRef(0);
  const nextObstacleTime = useRef(3); 

  const resetObstacles = () => {
    setHazardActive(false);
    hazardActiveRef.current = false;
    obstacleProgressRef.current = 0;
    timeSinceLastObstacle.current = 0;
    nextObstacleTime.current = 1.5 + Math.random() * 2;
  };

  const spawnObstacle = () => {
    setHazardActive(true);
    hazardActiveRef.current = true;
    obstacleProgressRef.current = 0;
    
    const rand = Math.random();
    let type = ObstacleType.ROCK;
    if (rand < 0.3) type = ObstacleType.CAR;
    else if (rand < 0.6) type = ObstacleType.ANIMAL;
    else if (rand < 0.8) type = ObstacleType.SHEEP;
    else type = ObstacleType.ROCK;
    setObstacleType(type);

    const top = 20 + Math.random() * 60;
    const left = 20 + Math.random() * 60;
    setHazardPosition({ top: `${top}%`, left: `${left}%` });

    timeSinceLastObstacle.current = 0;
    nextObstacleTime.current = 1.5 + Math.random() * 2.0;
  };

  const updateObstacle = (delta: number, speed: number) => {
    if (hazardActiveRef.current) {
        const approachSpeed = 0.5 * speed * delta; 
        const newProgress = obstacleProgressRef.current + approachSpeed;
        obstacleProgressRef.current = newProgress;
        
        if (newProgress > 1.6) {
            setHazardActive(false);
            hazardActiveRef.current = false;
            obstacleProgressRef.current = 0;
            return { active: false, progress: 0 };
        }
        return { active: true, progress: newProgress };
    } else {
        timeSinceLastObstacle.current += delta;
        if (timeSinceLastObstacle.current > nextObstacleTime.current) {
            spawnObstacle();
            return { active: true, progress: 0, spawned: true };
        }
        return { active: false, progress: 0 };
    }
  };

  // Helper to force set progress (mainly for reset logic in main loop)
  const setObstacleProgress = (val: number) => {
    obstacleProgressRef.current = val;
  }

  return {
    hazardActive, hazardActiveRef, obstacleProgressRef, obstacleType, hazardPosition,
    setObstacleProgress, setHazardActive,
    resetObstacles, updateObstacle
  };
};
