'use client';

import React from 'react';
import { ContactShadows } from '@react-three/drei';

export function StudioCyc() {
  return (
    <>
      {/* 1. STUDIO LIGHTING RIG */}
      {/* Soft warm ambient light */}
      <ambientLight color="#FFFDF7" intensity={0.65} />

      {/* Main Warm Directional Key Spotlight (Top-Left) */}
      <directionalLight
        color="#FFF9ED"
        intensity={1.25}
        position={[3.5, 5.5, 4.2]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Soft Ambient Fill Light (Left-Low) */}
      <directionalLight
        color="#F3EAD8"
        intensity={0.5}
        position={[-3.8, 2.2, 2.5]}
      />

      {/* Backlight / Rim Kicker for Garment Silhouettes */}
      <directionalLight
        color="#FFF6E9"
        intensity={0.7}
        position={[0, 4.0, -3.8]}
      />

      {/* 2. SOFT GROUND CONTACT SHADOW PLANE */}
      {/* Anchors the garments and rail naturally in physical 3D space */}
      <ContactShadows
        position={[0, -2.55, 0]}
        opacity={0.45}
        scale={16}
        blur={2.4}
        far={4.5}
        color="#4A3B2C"
      />
    </>
  );
}
