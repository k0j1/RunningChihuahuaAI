import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';

interface CheetahProps {
  speed: number;
  isRunning: boolean;
  lives: number;
  isHit?: boolean;
  isThrowing?: boolean;
  level: number;
  isDefeated: boolean;
}

export const Cheetah: React.FC<CheetahProps> = ({ speed, isRunning, lives, isHit, isThrowing, level, isDefeated }) => {
  const group = useRef<Group>(null);
  
  // Refs
  const bodyRef = useRef<Mesh>(null);
  const legFLRef = useRef<Group>(null);
  const legFRRef = useRef<Group>(null);
  const legBLRef = useRef<Group>(null);
  const legBRRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const tailRef = useRef<Mesh>(null);

  const targetZ = Math.min(16, Math.max(0, (lives / 3) * 16));
  // Base Scale 1.5. Level 2 (2nd boss) becomes 2x size (3.0).
  const scale = 1.5 * (level >= 2 ? 2.0 : 1.0);

  useFrame((state) => {
    if (!group.current) return;

    if (isHit) {
      group.current.visible = Math.floor(state.clock.elapsedTime * 15) % 2 === 0;
    } else {
      group.current.visible = true;
    }

    if (isDefeated) {
      group.current.rotation.x -= 0.05;
      group.current.position.z += 0.5;
      return;
    } else {
      group.current.rotation.x = 0;
    }

    group.current.position.z += (targetZ - group.current.position.z) * 0.02;

    if (!isRunning && lives <= 0) return;

    const t = state.clock.elapsedTime * speed * 12; // Faster animation speed for Cheetah
    
    // Fast running bounce
    group.current.position.y = Math.abs(Math.sin(t)) * 0.15;
    
    // Lean into run
    group.current.rotation.x = 0.1;

    // Leg animations (Gallop style)
    if (legFLRef.current) legFLRef.current.rotation.x = Math.sin(t) * 1.0;
    if (legFRRef.current) legFRRef.current.rotation.x = Math.sin(t + 0.2) * 1.0;
    if (legBLRef.current) legBLRef.current.rotation.x = Math.sin(t + Math.PI) * 1.0;
    if (legBRRef.current) legBRRef.current.rotation.x = Math.sin(t + Math.PI + 0.2) * 1.0;

    // Tail whip
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(t) * 0.5;
    if (tailRef.current) tailRef.current.rotation.z = Math.cos(t) * 0.2;

    // Head stabilization
    if (headRef.current) headRef.current.rotation.x = -0.1 + Math.sin(t * 0.5) * 0.05;
  });

  const bodyColor = "#FFD700"; // Gold
  const spotColor = "#000000";

  return (
    <group ref={group} position={[0, 0, targetZ]} rotation={[0, Math.PI, 0]} scale={[scale, scale, scale]}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.5, 1.2]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* Spots */}
      <mesh position={[0, 0.86, 0.2]}>
        <boxGeometry args={[0.2, 0.02, 0.2]} />
        <meshStandardMaterial color={spotColor} />
      </mesh>
      <mesh position={[0.1, 0.86, -0.3]}>
        <boxGeometry args={[0.15, 0.02, 0.15]} />
        <meshStandardMaterial color={spotColor} />
      </mesh>
       <mesh position={[-0.15, 0.86, 0]}>
        <boxGeometry args={[0.15, 0.02, 0.15]} />
        <meshStandardMaterial color={spotColor} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 0.9, 0.7]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.35, 0.4]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.12, 0.2, -0.1]}>
           <boxGeometry args={[0.08, 0.08, 0.05]} />
           <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0.12, 0.2, -0.1]}>
           <boxGeometry args={[0.08, 0.08, 0.05]} />
           <meshStandardMaterial color={bodyColor} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, 0, 0.21]}>
           <boxGeometry args={[0.1, 0.1, 0.05]} />
           <meshStandardMaterial color="#000" />
        </mesh>
      </group>

      {/* Tail */}
      <mesh ref={tailRef} position={[0, 0.7, -0.6]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.08, 0.08, 0.8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* Legs */}
      <group ref={legFLRef} position={[-0.2, 0.4, 0.45]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.2, 0.4, 0.45]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </group>
      <group ref={legBLRef} position={[-0.2, 0.4, -0.45]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </group>
      <group ref={legBRRef} position={[0.2, 0.4, -0.45]}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </group>
    </group>
  );
};