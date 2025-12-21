import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';

interface DragonProps {
  speed: number;
  isRunning: boolean;
  lives: number;
  isHit?: boolean;
  isThrowing?: boolean;
  level: number;
  isDefeated: boolean;
}

export const Dragon: React.FC<DragonProps> = ({ speed, isRunning, lives, isHit, isThrowing, level, isDefeated }) => {
  const group = useRef<Group>(null);
  
  // Refs
  const wingLRef = useRef<Group>(null);
  const wingRRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const jawRef = useRef<Mesh>(null);
  const tailRef = useRef<Group>(null);

  const targetZ = Math.min(16, Math.max(0, (lives / 3) * 16));
  // Base Scale 2.0. Level 2 (2nd boss) becomes 1.5x size (3.0).
  const scale = 2.0 * (level >= 2 ? 1.5 : 1.0); 

  useFrame((state) => {
    if (!group.current) return;

    if (isHit) {
      group.current.visible = Math.floor(state.clock.elapsedTime * 15) % 2 === 0;
    } else {
      group.current.visible = true;
    }

    if (isDefeated) {
      group.current.rotation.x -= 0.05;
      group.current.position.y -= 0.1;
      group.current.position.z += 0.5;
      return;
    } else {
      group.current.rotation.x = 0;
    }

    group.current.position.z += (targetZ - group.current.position.z) * 0.02;

    if (!isRunning && lives <= 0) return;

    const t = state.clock.elapsedTime * speed * 5; 
    
    // Hovering Flight
    group.current.position.y = 2.5 + Math.sin(t * 0.5) * 0.5;
    group.current.rotation.z = Math.sin(t * 0.3) * 0.05;

    // Wing Flap
    if (wingLRef.current) wingLRef.current.rotation.z = Math.sin(t * 2) * 0.5 + 0.2;
    if (wingRRef.current) wingRRef.current.rotation.z = -Math.sin(t * 2) * 0.5 - 0.2;

    // Tail Snake
    if (tailRef.current) {
        tailRef.current.rotation.y = Math.sin(t) * 0.3;
        tailRef.current.rotation.x = -0.2 + Math.cos(t) * 0.1;
    }

    // Head & Jaw
    if (headRef.current) headRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    if (jawRef.current) {
        if (isThrowing) {
            jawRef.current.rotation.x = 0.5; // Open mouth
        } else {
            jawRef.current.rotation.x = 0.1 + Math.sin(t) * 0.05;
        }
    }
  });

  const bodyColor = "#C62828"; // Red
  const bellyColor = "#FF8F00"; // Orange
  const wingColor = "#8E24AA"; // Purple

  return (
    <group ref={group} position={[0, 3, targetZ]} rotation={[0, Math.PI, 0]} scale={[scale, scale, scale]}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      
      {/* Belly */}
      <mesh position={[0, 0, 0.35]} scale={[0.8, 0.9, 0.2]}>
         <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
         <meshStandardMaterial color={bellyColor} />
      </mesh>

      {/* Head Group */}
      <group ref={headRef} position={[0, 0.8, 0.4]}>
         <mesh castShadow>
            <boxGeometry args={[0.5, 0.4, 0.6]} />
            <meshStandardMaterial color={bodyColor} />
         </mesh>
         {/* Horns */}
         <mesh position={[-0.2, 0.3, -0.2]} rotation={[0.2, 0, -0.2]}>
            <coneGeometry args={[0.05, 0.4, 8]} />
            <meshStandardMaterial color="#DDD" />
         </mesh>
         <mesh position={[0.2, 0.3, -0.2]} rotation={[0.2, 0, 0.2]}>
            <coneGeometry args={[0.05, 0.4, 8]} />
            <meshStandardMaterial color="#DDD" />
         </mesh>
         {/* Eyes */}
         <mesh position={[-0.15, 0.1, 0.31]}>
             <sphereGeometry args={[0.05]} />
             <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
         </mesh>
         <mesh position={[0.15, 0.1, 0.31]}>
             <sphereGeometry args={[0.05]} />
             <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
         </mesh>
         {/* Jaw */}
         <mesh ref={jawRef} position={[0, -0.2, 0.1]}>
             <boxGeometry args={[0.4, 0.1, 0.5]} />
             <meshStandardMaterial color={bodyColor} />
         </mesh>
      </group>

      {/* Wings */}
      <group ref={wingLRef} position={[-0.3, 0.2, -0.2]}>
         <mesh position={[-0.8, 0, 0.2]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[1.6, 0.1, 0.8]} />
            <meshStandardMaterial color={wingColor} />
         </mesh>
      </group>
      <group ref={wingRRef} position={[0.3, 0.2, -0.2]}>
         <mesh position={[0.8, 0, 0.2]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[1.6, 0.1, 0.8]} />
            <meshStandardMaterial color={wingColor} />
         </mesh>
      </group>

      {/* Tail */}
      <group ref={tailRef} position={[0, -0.5, -0.3]}>
         <mesh position={[0, -0.4, -0.5]} rotation={[-0.5, 0, 0]}>
             <cylinderGeometry args={[0.15, 0.05, 1.2]} />
             <meshStandardMaterial color={bodyColor} />
         </mesh>
         {/* Spike */}
         <mesh position={[0, -0.9, -1.0]} rotation={[-0.5, 0, 0]}>
             <coneGeometry args={[0.1, 0.3]} />
             <meshStandardMaterial color="#DDD" />
         </mesh>
      </group>

    </group>
  );
};