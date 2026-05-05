"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Line } from '@react-three/drei';
import * as THREE from 'three';

function NeuralGlobe() {
  const group = useRef<THREE.Group>(null);
  
  // Create a spherical distribution of nodes
  const nodes = useMemo(() => {
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
    const n = 150;
    
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      
      // Scale up the globe
      points.push(new THREE.Vector3(x * 2, y * 2, z * 2));
    }
    return points;
  }, []);

  // Create connections between close nodes
  const lines = useMemo(() => {
    const pairs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 0.8) {
          pairs.push([nodes[i], nodes[j]]);
        }
      }
    }
    return pairs;
  }, [nodes]);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.05;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.2;
    }
  });

  return (
    <group ref={group}>
      {/* Nodes */}
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#4f9cf9" transparent opacity={0.8} />
        </mesh>
      ))}
      
      {/* Edges */}
      {lines.map((pair, i) => (
        <Line 
          key={`line-${i}`}
          points={pair} 
          color="#a78bfa" 
          opacity={0.15} 
          transparent 
          lineWidth={1}
        />
      ))}

      {/* Core Glow */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#4f9cf9" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

export default function Scene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <fog attach="fog" args={['#050810', 3, 10]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
          <NeuralGlobe />
        </Float>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
