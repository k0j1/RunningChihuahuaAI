import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { ProjectileType } from '../types';

interface ProjectileProps {
  active: boolean;
  type: ProjectileType;
  progress: number; // 0 to 1
  startX: number; // Usually 0 (behind/center)
  startZ: number; // Z position of Gorilla when thrown
}

export const Projectile: React.FC<ProjectileProps> = ({ active, type, progress, startX, startZ }) => {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !active) return;
    
    // Spin animation
    groupRef.current.rotation.x += 0.1;
    groupRef.current.rotation.z += 0.1;
  });

  if (!active) return null;

  // Parabolic Arc Calculation
  // Start: Z = startZ (Gorilla), Y=2
  // End: Z=0 (Dog), Y=0.5
  
  const endZ = 0;
  const currentZ = startZ - (progress * (startZ - endZ));
  
  // Height Arc
  // Peak at progress = 0.5
  const startY = 2.5;
  const endY = 0.5;
  const peakHeight = 5;
  
  // Parabola: y = 4 * h * x * (1-x) + lerp(start, end, x)
  const arcY = (4 * peakHeight * progress * (1 - progress)) + (startY * (1-progress) + endY * progress);

  return (
    <group ref={groupRef} position={[startX, arcY, currentZ]} scale={[0.8, 0.8, 0.8]}>
      {type === ProjectileType.BARREL ? (
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.6, 8]} />
          <meshStandardMaterial color="#8B4513" />
          <mesh position={[0, 0.2, 0]}>
             <torusGeometry args={[0.41, 0.05, 4, 8]} />
             <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
             <torusGeometry args={[0.41, 0.05, 4, 8]} />
             <meshStandardMaterial color="#111" />
          </mesh>
        </mesh>
      ) : (
        <group>
           {/* Banana Shape */}
           <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI/4]} castShadow>
             <capsuleGeometry args={[0.15, 0.8, 4, 8]} />
             <meshStandardMaterial color="#FDD835" />
           </mesh>
        </group>
      )}
    </group>
  );
};