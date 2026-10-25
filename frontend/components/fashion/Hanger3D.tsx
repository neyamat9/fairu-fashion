'use client';

import React from 'react';
import * as THREE from 'three';

interface Hanger3DProps {
  hookColor?: string;
  woodColor?: string;
}

export function Hanger3D({
  hookColor = '#C5A059', // Brushed Champagne Brass
  woodColor = '#3D2619', // Dark Polished Teak / Mahogany
}: Hanger3DProps) {
  // Create smooth curved hanger hook geometry using a CurvePath
  const hookGeometry = React.useMemo(() => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    // Vertical stem from hanger body
    curve.add(
      new THREE.LineCurve3(
        new THREE.Vector3(0, 0.45, 0),
        new THREE.Vector3(0, 0.68, 0)
      )
    );
    // Circular hook arch over the rail
    curve.add(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0.68, 0),
        new THREE.Vector3(0, 0.95, 0),
        new THREE.Vector3(-0.16, 0.9, 0)
      )
    );
    curve.add(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.16, 0.9, 0),
        new THREE.Vector3(-0.25, 0.76, 0),
        new THREE.Vector3(-0.14, 0.68, 0)
      )
    );
    return new THREE.TubeGeometry(curve, 32, 0.018, 8, false);
  }, []);

  return (
    <group position={[0, 0.95, 0]}>
      {/* 1. Metallic Curved Hook */}
      <mesh geometry={hookGeometry}>
        <meshStandardMaterial
          color={hookColor}
          metalness={0.88}
          roughness={0.25}
        />
      </mesh>

      {/* 2. Central Hook Fastener Ring */}
      <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
        <meshStandardMaterial
          color={hookColor}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* 3. Contoured Wooden Hanger Body */}
      {/* Left Shoulder Slope */}
      <mesh
        position={[-0.45, 0.34, 0]}
        rotation={[0, 0, Math.PI / 13]}
      >
        <boxGeometry args={[0.95, 0.065, 0.055]} />
        <meshStandardMaterial
          color={woodColor}
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>

      {/* Right Shoulder Slope */}
      <mesh
        position={[0.45, 0.34, 0]}
        rotation={[0, 0, -Math.PI / 13]}
      >
        <boxGeometry args={[0.95, 0.065, 0.055]} />
        <meshStandardMaterial
          color={woodColor}
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>

      {/* Central Neck Joiner */}
      <mesh position={[0, 0.43, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color={woodColor}
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>

      {/* Wooden Trouser Crossbar */}
      <mesh position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 1.4, 16]} />
        <meshStandardMaterial
          color={woodColor}
          roughness={0.45}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}
