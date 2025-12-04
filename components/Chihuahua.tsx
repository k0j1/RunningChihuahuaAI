import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { DodgeType } from '../types';

interface ChihuahuaProps {
  speed: number;
  isRunning: boolean;
  isDodging: boolean;
  dodgeType: DodgeType;
  isHit: boolean;
}

export const Chihuahua: React.FC<ChihuahuaProps> = ({ speed, isRunning, isDodging, dodgeType, isHit }) => {
  const group = useRef<Group>(null);
  
  // Refs for animated parts
  const headRef = useRef<Mesh>(null);
  const tailRef = useRef<Mesh>(null);
  const legFLRef = useRef<Group>(null);
  const legFRRef = useRef<Group>(null);
  const legBLRef = useRef<Group>(null);
  const legBRRef = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;

    // Hit Blink Effect
    if (isHit) {
      group.current.visible = Math.floor(state.clock.elapsedTime * 20) % 2 === 0;
    } else {
      group.current.visible = true;
    }

    if (isRunning) {
        const t = state.clock.elapsedTime * speed * 10;
        
        let targetX = 0;
        let targetY = 0;
        let targetScaleY = 1.2;
        let targetRotZ = Math.sin(t) * 0.05;
        let targetRotY = Math.PI; // Default facing back towards camera (180 deg)

        // Dodge logic
        if (isDodging) {
             if (dodgeType === DodgeType.SIDESTEP) {
                targetX = 1.5; // Move Right
                targetRotZ = 0.3;
             } else if (dodgeType === DodgeType.JUMP) {
                targetY = 2.0; // Jump High
             } else if (dodgeType === DodgeType.SPIN) {
                // 360 Spin
                const spinSpeed = 15; 
                targetRotY = Math.PI + (state.clock.elapsedTime * spinSpeed); 
                targetY = 1.0; // Hop while spinning
             }
        } else {
             // Normal running bounce
             targetY = Math.sin(t * 2) * 0.1;
        }

        // Apply transforms
        // Use simpler lerp for positions
        group.current.position.x += (targetX - group.current.position.x) * 0.2;
        group.current.position.y += (targetY - group.current.position.y) * 0.2;
        group.current.scale.y += (targetScaleY - group.current.scale.y) * 0.2;
        
        // Rotations need careful handling for SPIN
        if (dodgeType === DodgeType.SPIN && isDodging) {
             group.current.rotation.y = targetRotY;
        } else {
             // Lerp back to Math.PI
             let currentY = group.current.rotation.y;
             // Normalize currentY to be close to Math.PI to avoid spinning the long way round
             while (currentY > Math.PI * 2) currentY -= Math.PI * 2;
             group.current.rotation.y += (Math.PI - currentY) * 0.1;
        }

        group.current.rotation.z += (targetRotZ - group.current.rotation.z) * 0.2;

        // Leg animations
        if (legFLRef.current) legFLRef.current.rotation.x = Math.sin(t) * 0.8;
        if (legFRRef.current) legFRRef.current.rotation.x = Math.sin(t + Math.PI) * 0.8;
        if (legBLRef.current) legBLRef.current.rotation.x = Math.sin(t + Math.PI) * 0.8;
        if (legBRRef.current) legBRRef.current.rotation.x = Math.sin(t) * 0.8;

        // Tail wag
        if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * 2) * 0.5;
        
        // Head bob
        if (headRef.current) headRef.current.rotation.x = Math.sin(t * 0.5) * 0.1 - 0.2;
    } else {
        // Idle
        if (group.current) {
            group.current.position.y = 0;
            group.current.position.x = 0;
            group.current.rotation.z = 0;
            group.current.rotation.y = Math.PI;
        }
    }
  });

  const tanColor = "#D2B48C"; 
  const whiteColor = "#FFFFFF"; 
  
  return (
    <group ref={group} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={[1.2, 1.2, 1.2]}>
      {/* Body */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.5, 0.9]} />
        <meshStandardMaterial color={tanColor} />
      </mesh>

      {/* Head Group */}
      <group position={[0, 0.8, 0.5]}>
        <mesh ref={headRef} castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.45, 0.45]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
        <mesh position={[0, -0.05, 0.25]} castShadow>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color={whiteColor} />
        </mesh>
        <mesh position={[0, 0.02, 0.35]}>
          <boxGeometry args={[0.08, 0.06, 0.05]} />
          <meshStandardMaterial color={"black"} />
        </mesh>
        <mesh position={[-0.12, 0.08, 0.23]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={"black"} />
        </mesh>
        <mesh position={[0.12, 0.08, 0.23]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={"black"} />
        </mesh>
        <mesh position={[-0.18, 0.25, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.1, 0.3, 4]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
        <mesh position={[0.18, 0.25, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.1, 0.3, 4]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>

      {/* Tail */}
      <mesh ref={tailRef} position={[0, 0.6, -0.5]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4]} />
        <meshStandardMaterial color={tanColor} />
      </mesh>

      {/* Legs */}
      <group ref={legFLRef} position={[-0.15, 0.2, 0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>
      <group ref={legFRRef} position={[0.15, 0.2, 0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>
      <group ref={legBLRef} position={[-0.15, 0.2, -0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>
      <group ref={legBRRef} position={[0.15, 0.2, -0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>
    </group>
  );
};