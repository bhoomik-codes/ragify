"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, TorusKnot, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function BrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
      <TorusKnot ref={meshRef} args={[1, 0.3, 128, 32]}>
        <MeshDistortMaterial 
          color="#4f9cf9" 
          attach="material" 
          distort={0.3} 
          speed={2} 
          roughness={0.2} 
          metalness={0.8}
          wireframe={true}
        />
      </TorusKnot>
    </Float>
  );
}

export default function BrainScene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 5]} intensity={1} />
        <BrainMesh />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
}
