
import React, { Suspense } from 'react';
import { Sky, Environment, OrbitControls } from '@react-three/drei';
import { Chihuahua } from './Chihuahua';
import { Gorilla } from './Gorilla';
import { Cheetah } from './Cheetah';
import { Dragon } from './Dragon';
import { World } from './World';
import { Obstacle } from './Obstacle';
import { Projectile } from './Projectile';
import { GameLoop } from './GameLoop';
import { CameraController } from './CameraController';
import { GameState, BossType } from '../types';

interface GameSceneProps {
  gameLogic: any; // Type inferred from useGameLogic return
}

export const GameScene: React.FC<GameSceneProps> = ({ gameLogic }) => {
  const {
    gameState, speed, dayTime, lives,
    bossType, bossLevel, isBossDefeated, isBossHit, isThrowing,
    hazardActive, obstacleType, obstacleProgress, 
    projectileActive, projectileType, projectileProgress, projectileStartZ,
    isDodging, dodgeType, isHit,
    handleDistanceUpdate, handleObstacleTick, setObstacleProgress,
    handleProjectileTick, setProjectileProgress
  } = gameLogic;

  const projectileScale = 1 + (bossLevel - 1) * 0.5;

  return (
    <>
      <CameraController gameState={gameState} lives={lives} bossType={bossType} bossLevel={bossLevel} />
      <Suspense fallback={null}>
        <GameLoop 
          gameState={gameState} 
          speed={speed} 
          onDistanceUpdate={handleDistanceUpdate}
          onObstacleTick={handleObstacleTick}
          onProjectileTick={handleProjectileTick}
        />

        <ambientLight intensity={dayTime ? 0.5 : 0.1} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={dayTime ? 1.2 : 0.2} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
        >
          <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10]} />
        </directionalLight>
        
        <Sky 
          sunPosition={dayTime ? [100, 20, 100] : [100, -20, 100]} 
          turbidity={dayTime ? 0.5 : 10}
          rayleigh={dayTime ? 0.5 : 0.2}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
        { !dayTime && <Environment preset="night" /> }
        
        <Chihuahua 
          speed={gameState === GameState.RUNNING ? speed : 0} 
          isRunning={gameState === GameState.RUNNING}
          isDodging={isDodging}
          dodgeType={dodgeType}
          isHit={isHit}
          isDefeated={gameState === GameState.CAUGHT_ANIMATION || gameState === GameState.GAME_OVER}
        />

        {bossType === BossType.GORILLA && (
          <Gorilla
            speed={gameState === GameState.RUNNING ? speed : 0} 
            isRunning={gameState === GameState.RUNNING}
            lives={lives}
            isHit={isBossHit}
            isThrowing={isThrowing}
            isDrumming={gameState === GameState.CAUGHT_ANIMATION}
            level={bossLevel}
            isDefeated={isBossDefeated}
          />
        )}
        {bossType === BossType.CHEETAH && (
          <Cheetah
            speed={gameState === GameState.RUNNING ? speed : 0} 
            isRunning={gameState === GameState.RUNNING}
            lives={lives}
            isHit={isBossHit}
            isThrowing={isThrowing}
            level={bossLevel}
            isDefeated={isBossDefeated}
          />
        )}
        {bossType === BossType.DRAGON && (
          <Dragon
            speed={gameState === GameState.RUNNING ? speed : 0} 
            isRunning={gameState === GameState.RUNNING}
            lives={lives}
            isHit={isBossHit}
            isThrowing={isThrowing}
            level={bossLevel}
            isDefeated={isBossDefeated}
          />
        )}
        
        <World 
          speed={gameState === GameState.RUNNING ? speed : 0} 
          isRunning={gameState === GameState.RUNNING}
        />

        <Obstacle 
           active={hazardActive}
           type={obstacleType}
           speed={speed}
           progress={obstacleProgress}
        />

        <Projectile 
           active={projectileActive}
           type={projectileType}
           progress={projectileProgress}
           startX={0}
           startZ={projectileStartZ}
           scale={projectileScale}
        />

        <OrbitControls 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2 - 0.1} 
          minPolarAngle={Math.PI / 4}
          maxDistance={20} 
          minDistance={3}
        />
        
        <fog attach="fog" args={[dayTime ? '#87CEEB' : '#050505', 10, 50]} />
      </Suspense>
    </>
  );
};
