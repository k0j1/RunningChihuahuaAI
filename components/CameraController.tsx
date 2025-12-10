
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { GameState, BossType } from '../types';

interface CameraControllerProps {
  gameState: GameState;
  lives: number;
  bossType: BossType;
  bossLevel: number;
}

export const CameraController: React.FC<CameraControllerProps> = ({ 
  gameState, 
  lives, 
  bossType, 
  bossLevel 
}) => {
  const { camera, size } = useThree();
  const isMobile = size.width < 768;
  const lookAtTarget = useRef(new Vector3(0, 0, 0));

  // Determine Boss Scale/Height logic
  let scale = 1.0;
  if (bossType === BossType.GORILLA) {
     scale = 1.8 * (1 + (bossLevel - 1) * 0.5);
  } else if (bossType === BossType.CHEETAH) {
     scale = 1.5 * (1 + (bossLevel - 1) * 0.3);
  } else if (bossType === BossType.DRAGON) {
     scale = 2.0 * (1 + (bossLevel - 1) * 0.2);
  }

  const faceHeight = 1.4 * scale;
  
  // When drumming/caught, Boss moves to Z=2
  const bossFaceZ = 2 + 0.5; 
  
  const startCamPos = new Vector3(0, faceHeight, bossFaceZ - 2.5);
  const overheadPos = new Vector3(0, 12, 5); 
  const centerScenePos = new Vector3(0, 0, 2);

  useEffect(() => {
    if (gameState === GameState.CAUGHT_ANIMATION) {
       // Start strictly focusing on Boss Face
       camera.position.copy(startCamPos);
       
       // Initialize lookAt ref to face
       lookAtTarget.current.set(0, faceHeight, bossFaceZ);
       camera.lookAt(lookAtTarget.current);
    }
  }, [gameState, camera, faceHeight, bossFaceZ, startCamPos.x, startCamPos.y, startCamPos.z]);
  
  useFrame((state, delta) => {
    if (gameState === GameState.CAUGHT_ANIMATION) {
       // Lerp Position to Overhead
       camera.position.lerp(overheadPos, delta * 0.5);
       
       // Lerp LookAt Target from Face to Ground Center
       lookAtTarget.current.lerp(centerScenePos, delta * 0.5);
       camera.lookAt(lookAtTarget.current);
    } else {
       // Standard Game Camera
       const target = isMobile ? new Vector3(1.5, 6, -12) : new Vector3(3, 3, -5);
       camera.position.lerp(target, delta * 5);
       lookAtTarget.current.set(0, 0, 0); 
       camera.lookAt(0, 0, 0);
    }
  });
  
  return null;
};
