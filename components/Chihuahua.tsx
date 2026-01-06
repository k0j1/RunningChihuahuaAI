
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { Text } from '@react-three/drei';
import { DodgeType } from '../types';

interface ChihuahuaProps {
  speed: number;
  isRunning: boolean;
  isDodging: boolean;
  dodgeType: DodgeType;
  isHit: boolean;
  isCelebrating?: boolean;
  isDefeated?: boolean;
}

const MusicalNote: React.FC<{ offset: number; active: boolean }> = ({ offset, active }) => {
  const ref = useRef<Group>(null);
  
  useFrame((state) => {
    // Optimization: Don't animate if not active/visible
    if (!active) return;

    if (ref.current) {
      const t = state.clock.elapsedTime + offset;
      // Float up and sway
      ref.current.position.y = 1.0 + (t % 1.5);
      ref.current.position.x = Math.sin(t * 3) * 0.2;
      ref.current.rotation.z = Math.sin(t * 5) * 0.2;
      
      // Fade out logic could go here by manipulating material opacity, 
      // but simple movement conveys the effect well enough.
      const scale = 1.0 - ((t % 1.5) / 1.5); // Shrink as it goes up
      ref.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={ref}>
      <Text
        color="#F43F5E" // Pinkish Red
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#FFFFFF"
        characters="♫♪" // Preload specific characters to optimize font atlas
      >
        {offset % 2 > 1 ? "♫" : "♪"}
      </Text>
    </group>
  );
};

export const Chihuahua: React.FC<ChihuahuaProps> = ({ speed, isRunning, isDodging, dodgeType, isHit, isCelebrating, isDefeated }) => {
  const group = useRef<Group>(null);
  
  // Refs for animated parts
  const headRef = useRef<Mesh>(null);
  const tailRef = useRef<Mesh>(null);
  const earLRef = useRef<Mesh>(null);
  const earRRef = useRef<Mesh>(null);
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

    if (isDefeated) {
        // Fall over animation
        group.current.rotation.z += (Math.PI / 2 - group.current.rotation.z) * 0.1;
        group.current.position.y += (0.2 - group.current.position.y) * 0.1;
        return;
    }

    if (isRunning) {
        const t = state.clock.elapsedTime * speed * 10;
        
        let targetX = 0;
        let targetY = 0;
        let targetScaleY = 1.2;
        let targetRotZ = Math.sin(t) * 0.05;
        let targetRotY = Math.PI; // Default facing back towards camera (180 deg)

        // Celebration Override
        if (isCelebrating) {
             // Happy Bounce
             targetY = Math.abs(Math.sin(state.clock.elapsedTime * 15)) * 0.5;
             targetRotZ = 0;
             // Wag tail furiously logic below
        }
        // Dodge logic (Priority over celebration movement if dodging happened to trigger)
        else if (isDodging) {
             if (dodgeType === DodgeType.SIDESTEP) {
                targetX = 1.5; // Move Right
                targetRotZ = 0.3;
             } else if (dodgeType === DodgeType.JUMP) {
                targetY = 2.0; // Jump High
             } else if (dodgeType === DodgeType.SPIN) {
                const spinSpeed = 15; 
                targetRotY = Math.PI + (state.clock.elapsedTime * spinSpeed); 
                targetY = 1.0; 
             }
        } else {
             // Normal running bounce
             targetY = Math.sin(t * 2) * 0.1;
        }

        // Apply transforms
        group.current.position.x += (targetX - group.current.position.x) * 0.2;
        group.current.position.y += (targetY - group.current.position.y) * 0.2;
        group.current.scale.y += (targetScaleY - group.current.scale.y) * 0.2;
        
        if (dodgeType === DodgeType.SPIN && isDodging) {
             group.current.rotation.y = targetRotY;
        } else {
             let currentY = group.current.rotation.y;
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
        if (tailRef.current) {
            if (isCelebrating) {
                 tailRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 25) * 1.0; // Furious wag
            } else {
                 tailRef.current.rotation.y = Math.sin(t * 2) * 0.5;
            }
        }
        
        // Head bob
        if (headRef.current) headRef.current.rotation.x = Math.sin(t * 0.5) * 0.1 - 0.2;

        // Reset ears during run
        if (earLRef.current) earLRef.current.rotation.z = 0.3;
        if (earRRef.current) earRRef.current.rotation.z = -0.3;

    } else {
        // IDLE ANIMATION (Paused / Title)
        const t = state.clock.elapsedTime;
        
        // Reset Position/Rotation to center/facing camera
        group.current.position.x += (0 - group.current.position.x) * 0.1;
        group.current.rotation.y += (Math.PI - group.current.rotation.y) * 0.1;
        group.current.rotation.z += (0 - group.current.rotation.z) * 0.1;

        // Shifting Weight / Breathing
        // Gentle Y movement
        group.current.position.y = Math.sin(t * 2) * 0.02;
        // Subtle Squash/Stretch
        group.current.scale.y = 1.2 + Math.sin(t * 2) * 0.01;

        // Idle Head Movement (Looking around slowly)
        if (headRef.current) {
            headRef.current.rotation.y = Math.sin(t * 0.5) * 0.1; // Look left/right
            headRef.current.rotation.x = -0.1 + Math.sin(t * 1.2) * 0.05; // Slight nod
        }

        // Idle Tail Wag (Slow)
        if (tailRef.current) {
            tailRef.current.rotation.y = Math.sin(t * 3) * 0.2;
        }

        // Ear Twitching
        // Occurs occasionally using overlapping sine waves or random threshold
        if (earLRef.current) {
           // Twitch left ear every ~3 seconds
           const twitch = Math.sin(t * 10) > 0.9 && Math.sin(t) > 0.5 ? 0.3 : 0;
           earLRef.current.rotation.z = 0.3 + twitch;
        }
        if (earRRef.current) {
           // Twitch right ear at different interval
           const twitch = Math.sin(t * 12) > 0.9 && Math.sin(t * 0.8) < -0.5 ? -0.3 : 0;
           earRRef.current.rotation.z = -0.3 + twitch;
        }

        // Reset Legs
        if (legFLRef.current) legFLRef.current.rotation.x = 0;
        if (legFRRef.current) legFRRef.current.rotation.x = 0;
        if (legBLRef.current) legBLRef.current.rotation.x = 0;
        if (legBRRef.current) legBRRef.current.rotation.x = 0;
    }
  });

  const tanColor = "#D2B48C"; 
  const whiteColor = "#FFFFFF"; 
  
  return (
    <group ref={group} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={[1.2, 1.2, 1.2]}>
      {/* Celebration Particles */}
      <group position={[0, 1.5, 0]} visible={!!isCelebrating}>
         <MusicalNote offset={0} active={!!isCelebrating} />
         <group position={[0.6, -0.2, 0]}><MusicalNote offset={0.5} active={!!isCelebrating} /></group>
         <group position={[-0.6, -0.2, 0]}><MusicalNote offset={1.0} active={!!isCelebrating} /></group>
      </group>

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
        
        {/* Ears - Now with Refs */}
        <mesh ref={earLRef} position={[-0.18, 0.25, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.1, 0.3, 4]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
        <mesh ref={earRRef} position={[0.18, 0.25, 0]} rotation={[0, 0, -0.3]}>
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
