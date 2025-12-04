import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group } from 'three';
import { ObstacleType } from '../types';

interface ObstacleProps {
  active: boolean;
  type: ObstacleType;
  speed: number;
  progress: number; // 0 to 1
}

export const Obstacle: React.FC<ObstacleProps> = ({ active, type, speed, progress }) => {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Rotate animation based on type
    if (active) {
       if (type === ObstacleType.ROCK) {
          groupRef.current.rotation.x += 0.05 * speed;
          groupRef.current.rotation.y += 0.05 * speed;
       } else if (type === ObstacleType.ANIMAL || type === ObstacleType.SHEEP) {
          // Hop animation
          groupRef.current.position.y = 0.5 + Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.3;
       }
    }
  });

  if (!active) return null;

  // Map progress (0 to 1) to Z position (-40 to 0)
  const zPos = -40 + (progress * 40);

  const renderMesh = () => {
    switch (type) {
      case ObstacleType.CAR:
        return (
          <group>
            {/* Body */}
            <mesh position={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[1.2, 0.6, 2]} />
              <meshStandardMaterial color="#ef4444" /> {/* Red Car */}
            </mesh>
            {/* Cabin */}
            <mesh position={[0, 0.8, 0.2]}>
              <boxGeometry args={[1, 0.5, 1]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            {/* Wheels */}
            <mesh position={[-0.6, 0.2, 0.6]} rotation={[0, 0, Math.PI/2]}>
               <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0.6, 0.2, 0.6]} rotation={[0, 0, Math.PI/2]}>
               <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[-0.6, 0.2, -0.6]} rotation={[0, 0, Math.PI/2]}>
               <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
            </mesh>
             <mesh position={[0.6, 0.2, -0.6]} rotation={[0, 0, Math.PI/2]}>
               <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        );
      case ObstacleType.ANIMAL:
        return (
          <group>
             {/* Pig/Boar thing */}
             <mesh position={[0, 0.3, 0]} castShadow>
               <boxGeometry args={[0.6, 0.5, 0.8]} />
               <meshStandardMaterial color="#f472b6" />
             </mesh>
             <mesh position={[0, 0.6, 0.4]}>
                <boxGeometry args={[0.1, 0.2, 0.1]} />
                <meshStandardMaterial color="#f472b6" />
             </mesh>
              <mesh position={[0, 0.4, 0.5]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial color="#be185d" />
             </mesh>
          </group>
        );
      case ObstacleType.SHEEP:
        return (
          <group>
             {/* Flock of Sheep */}
             {[0, 1, 2].map((i) => (
               <group key={i} position={[(i-1)*0.8, 0, (i%2)*0.5]}>
                 <mesh position={[0, 0.3, 0]} castShadow>
                   <boxGeometry args={[0.5, 0.4, 0.6]} />
                   <meshStandardMaterial color="#ffffff" />
                 </mesh>
                 <mesh position={[0, 0.5, 0.3]}>
                    <boxGeometry args={[0.2, 0.2, 0.2]} />
                    <meshStandardMaterial color="#111" />
                 </mesh>
               </group>
             ))}
          </group>
        );
      case ObstacleType.ROCK:
      default:
        return (
          <mesh position={[0, 0.5, 0]} castShadow>
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#5D4037" roughness={0.8} />
          </mesh>
        );
    }
  };

  return (
    <group ref={groupRef} position={[0, 0, zPos]}>
      {renderMesh()}
    </group>
  );
};