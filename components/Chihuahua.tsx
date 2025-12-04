import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';

interface ChihuahuaProps {
  speed: number;
  isRunning: boolean;
}

export const Chihuahua: React.FC<ChihuahuaProps> = ({ speed, isRunning }) => {
  const group = useRef<Group>(null);
  
  // Refs for animated parts
  const headRef = useRef<Mesh>(null);
  const tailRef = useRef<Mesh>(null);
  const legFLRef = useRef<Group>(null); // Front Left
  const legFRRef = useRef<Group>(null); // Front Right
  const legBLRef = useRef<Group>(null); // Back Left
  const legBRRef = useRef<Group>(null); // Back Right
  const bodyRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!group.current || !isRunning) return;

    const t = state.clock.elapsedTime * speed * 10;
    const verticalBounce = Math.sin(t * 2) * 0.1;

    // Body bounce
    // Base Y is 0, add bounce
    group.current.position.y = verticalBounce;
    group.current.rotation.z = Math.sin(t) * 0.05;

    // Leg animations (simple sine waves with phase shifts)
    if (legFLRef.current) legFLRef.current.rotation.x = Math.sin(t) * 0.8;
    if (legFRRef.current) legFRRef.current.rotation.x = Math.sin(t + Math.PI) * 0.8;
    if (legBLRef.current) legBLRef.current.rotation.x = Math.sin(t + Math.PI) * 0.8;
    if (legBRRef.current) legBRRef.current.rotation.x = Math.sin(t) * 0.8;

    // Tail wag
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * 2) * 0.5;
    
    // Head bob
    if (headRef.current) headRef.current.rotation.x = Math.sin(t * 0.5) * 0.1 - 0.2; // Slight look down
  });

  const tanColor = "#D2B48C"; // Tan
  const whiteColor = "#FFFFFF"; // White details
  const darkColor = "#3e2723"; // Dark brown/black for eyes/nose

  return (
    <group ref={group} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={[1.2, 1.2, 1.2]}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.5, 0.9]} />
        <meshStandardMaterial color={tanColor} />
      </mesh>

      {/* Head Group */}
      <group position={[0, 0.8, 0.5]}>
        {/* Head Main */}
        <mesh ref={headRef} castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.45, 0.45]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
        
        {/* Snout */}
        <mesh position={[0, -0.05, 0.25]} castShadow>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color={whiteColor} />
        </mesh>
        
        {/* Nose */}
        <mesh position={[0, 0.02, 0.35]}>
          <boxGeometry args={[0.08, 0.06, 0.05]} />
          <meshStandardMaterial color={"black"} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.12, 0.08, 0.23]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={"black"} />
        </mesh>
        <mesh position={[0.12, 0.08, 0.23]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={"black"} />
        </mesh>

        {/* Ears */}
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
      {/* Front Left */}
      <group ref={legFLRef} position={[-0.15, 0.2, 0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>

      {/* Front Right */}
      <group ref={legFRRef} position={[0.15, 0.2, 0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>

      {/* Back Left */}
      <group ref={legBLRef} position={[-0.15, 0.2, -0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>

      {/* Back Right */}
      <group ref={legBRRef} position={[0.15, 0.2, -0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.12]} />
          <meshStandardMaterial color={tanColor} />
        </mesh>
      </group>
    </group>
  );
};