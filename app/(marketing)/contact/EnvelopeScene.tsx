"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// A simple custom paper plane mesh instead of loading an external GLTF
// to keep it fast and self-contained.
function PaperPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Simulate flying
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1, 3, 3]} />
        <meshStandardMaterial 
          color="#4f9cf9" 
          roughness={0.1} 
          metalness={0.8}
          wireframe={true}
        />
      </mesh>
    </Float>
  );
}

export default function EnvelopeScene() {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <Center>
        <PaperPlane />
      </Center>
    </Canvas>
  );
}
