import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';

interface WorldProps {
  speed: number;
  isRunning: boolean;
}

const TREE_COUNT = 20;
const ROAD_LENGTH = 100;

export const World: React.FC<WorldProps> = ({ speed, isRunning }) => {
  const groundRef = useRef<Mesh>(null);
  const treesRef = useRef<Group>(null);
  const cloudsRef = useRef<Group>(null);

  // Generate random tree positions
  const treePositions = useMemo(() => {
    return new Array(TREE_COUNT).fill(0).map((_, i) => ({
      x: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5),
      z: -i * (ROAD_LENGTH / TREE_COUNT),
      scale: 0.8 + Math.random() * 0.5
    }));
  }, []);

  // Generate clouds
  const cloudPositions = useMemo(() => {
    return new Array(10).fill(0).map((_, i) => ({
      x: (Math.random() - 0.5) * 30,
      y: 5 + Math.random() * 5,
      z: -i * (ROAD_LENGTH / 5),
      scale: 1 + Math.random() * 2
    }));
  }, []);

  useFrame((state, delta) => {
    if (!isRunning) return;

    const moveDistance = speed * delta * 10;

    // Move ground texture effect (if we had texture) - here we just move the objects
    
    // Move trees
    if (treesRef.current) {
      treesRef.current.position.z += moveDistance;
      // Reset trees loop
      if (treesRef.current.position.z > ROAD_LENGTH / 2) {
        treesRef.current.position.z = -ROAD_LENGTH / 2;
      }
    }

    // Move clouds slower
    if (cloudsRef.current) {
      cloudsRef.current.position.z += moveDistance * 0.5;
       if (cloudsRef.current.position.z > ROAD_LENGTH / 2) {
        cloudsRef.current.position.z = -ROAD_LENGTH / 2;
      }
    }
  });

  return (
    <group>
      {/* Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 200]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      
      {/* Road markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.2, 200]} />
        <meshStandardMaterial color="#FFF" />
      </mesh>

      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 200]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>

      {/* Trees Group */}
      <group ref={treesRef}>
        {treePositions.map((pos, i) => (
          <group key={i} position={[pos.x, 0, pos.z]} scale={[pos.scale, pos.scale, pos.scale]}>
            {/* Trunk */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, 1]} />
              <meshStandardMaterial color="#8D6E63" />
            </mesh>
            {/* Leaves */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <coneGeometry args={[1, 2, 8]} />
              <meshStandardMaterial color="#2E7D32" />
            </mesh>
            <mesh position={[0, 2.5, 0]} castShadow>
              <coneGeometry args={[0.8, 1.5, 8]} />
              <meshStandardMaterial color="#388E3C" />
            </mesh>
          </group>
        ))}
         {/* Duplicate trees for endless illusion */}
         {treePositions.map((pos, i) => (
          <group key={`dup-${i}`} position={[pos.x, 0, pos.z - ROAD_LENGTH]} scale={[pos.scale, pos.scale, pos.scale]}>
             <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, 1]} />
              <meshStandardMaterial color="#8D6E63" />
            </mesh>
            <mesh position={[0, 1.5, 0]} castShadow>
              <coneGeometry args={[1, 2, 8]} />
              <meshStandardMaterial color="#2E7D32" />
            </mesh>
            <mesh position={[0, 2.5, 0]} castShadow>
              <coneGeometry args={[0.8, 1.5, 8]} />
              <meshStandardMaterial color="#388E3C" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Clouds */}
      <group ref={cloudsRef}>
        {cloudPositions.map((pos, i) => (
           <mesh key={i} position={[pos.x, pos.y, pos.z]} scale={[pos.scale, pos.scale * 0.6, pos.scale]}>
             <dodecahedronGeometry args={[1, 0]} />
             <meshStandardMaterial color="white" opacity={0.8} transparent />
           </mesh>
        ))}
         {/* Duplicate clouds */}
         {cloudPositions.map((pos, i) => (
           <mesh key={`cloud-dup-${i}`} position={[pos.x, pos.y, pos.z - ROAD_LENGTH]} scale={[pos.scale, pos.scale * 0.6, pos.scale]}>
             <dodecahedronGeometry args={[1, 0]} />
             <meshStandardMaterial color="white" opacity={0.8} transparent />
           </mesh>
        ))}
      </group>
    </group>
  );
};