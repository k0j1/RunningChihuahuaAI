import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';

interface GorillaProps {
  speed: number;
  isRunning: boolean;
  lives: number; // 3 = Far, 0 = Caught. Can be float.
  isHit?: boolean;
  isThrowing?: boolean;
}

export const Gorilla: React.FC<GorillaProps> = ({ speed, isRunning, lives, isHit, isThrowing }) => {
  const group = useRef<Group>(null);
  
  // Refs for animated parts
  const bodyRef = useRef<Mesh>(null);
  const armLRef = useRef<Group>(null);
  const armRRef = useRef<Group>(null);
  const legLRef = useRef<Group>(null);
  const legRRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);

  // Calculate target Z position based on lives (continuous)
  // Max distance (lives >= 3) is 16.0
  // Min distance (lives <= 0) is 0.0
  // Map linearly: z = (lives / 3) * 16
  const targetZ = Math.min(16, Math.max(0, (lives / 3) * 16));

  useFrame((state) => {
    if (!group.current) return;

    // Hit Blink Effect
    if (isHit) {
      group.current.visible = Math.floor(state.clock.elapsedTime * 15) % 2 === 0;
    } else {
      group.current.visible = true;
    }

    // Smoothly interpolate position Z (Lower lerp factor for smoothness)
    group.current.position.z += (targetZ - group.current.position.z) * 0.02;

    if (!isRunning && lives <= 0) {
        // Game Over pose logic could go here
        return;
    }

    const t = state.clock.elapsedTime * speed * 8; 
    
    // Heavy bounce
    group.current.position.y = Math.abs(Math.sin(t)) * 0.2;
    group.current.rotation.z = Math.sin(t) * 0.05;

    // Arm animations
    if (armLRef.current && armRRef.current) {
      if (isThrowing) {
        // Throwing animation: Both arms up
        armLRef.current.rotation.x = Math.PI - 0.5;
        armRRef.current.rotation.x = Math.PI - 0.5;
        armLRef.current.position.y = 1.2;
        armRRef.current.position.y = 1.2;
      } else {
        // Normal Running
        armLRef.current.rotation.x = Math.sin(t) * 0.6;
        armLRef.current.position.y = 0.8 + Math.sin(t) * 0.1;
        
        armRRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
        armRRef.current.position.y = 0.8 + Math.sin(t + Math.PI) * 0.1;
      }
    }

    // Leg animations
    if (legLRef.current) legLRef.current.rotation.x = Math.sin(t + Math.PI) * 0.8;
    if (legRRef.current) legRRef.current.rotation.x = Math.sin(t) * 0.8;

    // Head subtle bob
    if (headRef.current) headRef.current.rotation.x = Math.sin(t * 2) * 0.05 + 0.1;
  });

  const furColor = "#333333";
  const skinColor = "#1a1a1a";
  const chestColor = "#444444";

  return (
    // Positioned behind the dog, rotated to face same direction as dog (towards camera)
    <group ref={group} position={[0, 0, targetZ]} rotation={[0, Math.PI, 0]} scale={[1.8, 1.8, 1.8]}>
      
      {/* Torso */}
      <mesh ref={bodyRef} position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.8, 0.6]} />
        <meshStandardMaterial color={furColor} />
      </mesh>

      {/* Chest/Abs */}
      <mesh position={[0, 0.9, 0.31]}>
        <planeGeometry args={[0.7, 0.6]} />
        <meshStandardMaterial color={chestColor} />
      </mesh>

      {/* Head Group */}
      <group ref={headRef} position={[0, 1.4, 0.2]}>
        {/* Skull */}
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.5, 0.5]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
        {/* Brow Ridge */}
        <mesh position={[0, 0.15, 0.25]}>
          <boxGeometry args={[0.42, 0.1, 0.1]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        {/* Face/Muzzle */}
        <mesh position={[0, -0.1, 0.25]}>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        {/* Eyes (Red glowing for intensity) */}
        <mesh position={[-0.1, 0.05, 0.26]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.1, 0.05, 0.26]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Arms */}
      <group ref={armLRef} position={[-0.55, 1.1, 0]}>
        <mesh position={[0, -0.6, 0]} castShadow>
          <boxGeometry args={[0.25, 1.2, 0.25]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
        {/* Fist */}
        <mesh position={[0, -1.2, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      <group ref={armRRef} position={[0.55, 1.1, 0]}>
        <mesh position={[0, -0.6, 0]} castShadow>
          <boxGeometry args={[0.25, 1.2, 0.25]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
        {/* Fist */}
        <mesh position={[0, -1.2, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      {/* Legs */}
      <group ref={legLRef} position={[-0.25, 0.5, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
      </group>

      <group ref={legRRef} position={[0.25, 0.5, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
      </group>
    </group>
  );
};