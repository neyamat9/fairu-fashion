'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FashionProduct3D, ColorVariant } from '@/types/fashion';
import { Hanger3D } from './Hanger3D';
import { getGarmentTexture } from '@/lib/fashion-textures';

interface Garment3DProps {
  product: FashionProduct3D;
  activeColor: ColorVariant;
  isHovered: boolean;
  isSelected: boolean;
  position: [number, number, number];
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  manualRotationY?: number;
}

export function Garment3D({
  product,
  activeColor,
  isHovered,
  isSelected,
  position,
  onHover,
  onClick,
  manualRotationY,
}: Garment3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshGroupRef = useRef<THREE.Group>(null);

  // Generate high-resolution PBR textures from reference patterns
  const frontTexture = useMemo(() => {
    return getGarmentTexture(
      activeColor.texturePattern || product.texturePattern,
      activeColor.hex,
      activeColor.accentHex,
      false
    );
  }, [activeColor, product.texturePattern]);

  const backTexture = useMemo(() => {
    return getGarmentTexture(
      activeColor.texturePattern || product.texturePattern,
      activeColor.hex,
      activeColor.accentHex,
      true
    );
  }, [activeColor, product.texturePattern]);

  // Target values for smooth lerp transitions
  const targetZ = isHovered && !isSelected ? position[2] + 0.38 : position[2];
  const targetScale = isHovered && !isSelected ? 1.06 : 1.0;
  const targetRotationY = isSelected
    ? (manualRotationY ?? 0)
    : isHovered
    ? Math.PI // 180° smooth turn to inspect the back
    : 0;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth position interpolation (Z-lift on hover)
    groupRef.current.position.z = THREE.MathUtils.damp(
      groupRef.current.position.z,
      targetZ,
      7,
      delta
    );

    // Smooth scale interpolation
    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.damp(currentScale, targetScale, 8, delta);
    groupRef.current.scale.set(newScale, newScale, newScale);

    // Smooth Y-axis rotation interpolation (front/back reveal)
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.y = THREE.MathUtils.damp(
        meshGroupRef.current.rotation.y,
        targetRotationY,
        6,
        delta
      );

      // Subtle gentle fabric idle sway when on the rail
      if (!isSelected) {
        const time = state.clock.getElapsedTime();
        const sway = Math.sin(time * 1.6 + position[0] * 1.5) * 0.025;
        meshGroupRef.current.rotation.z = THREE.MathUtils.damp(
          meshGroupRef.current.rotation.z,
          sway,
          3,
          delta
        );
      } else {
        meshGroupRef.current.rotation.z = THREE.MathUtils.damp(
          meshGroupRef.current.rotation.z,
          0,
          8,
          delta
        );
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHover?.(product.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        onHover?.(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(product.id);
      }}
    >
      <group ref={meshGroupRef}>
        {/* ============================================================ */}
        {/* 1. SOLID WOOD HANGER & METALLIC HOOK                         */}
        {/* ============================================================ */}
        <Hanger3D />

        {/* ============================================================ */}
        {/* 2. KAMEEZ (TUNIC BODY - FRONT & BACK WITH FABRIC DEPTH)      */}
        {/* ============================================================ */}
        <group position={[0, 0.45, 0]}>
          {/* Front Kameez Panel */}
          <mesh position={[0, -0.65, 0.038]}>
            <boxGeometry args={[1.05, 1.48, 0.015]} />
            <meshStandardMaterial
              map={frontTexture}
              roughness={0.82}
              metalness={0.03}
              bumpScale={0.02}
            />
          </mesh>

          {/* Back Kameez Panel */}
          <mesh position={[0, -0.65, -0.038]} rotation={[0, Math.PI, 0]}>
            <boxGeometry args={[1.05, 1.48, 0.015]} />
            <meshStandardMaterial
              map={backTexture}
              roughness={0.82}
              metalness={0.03}
              bumpScale={0.02}
            />
          </mesh>

          {/* Left Side Seam Fabric Thickness */}
          <mesh position={[-0.525, -0.65, 0]}>
            <boxGeometry args={[0.015, 1.48, 0.076]} />
            <meshStandardMaterial
              color={activeColor.hex}
              roughness={0.85}
              metalness={0.02}
            />
          </mesh>

          {/* Right Side Seam Fabric Thickness */}
          <mesh position={[0.525, -0.65, 0]}>
            <boxGeometry args={[0.015, 1.48, 0.076]} />
            <meshStandardMaterial
              color={activeColor.hex}
              roughness={0.85}
              metalness={0.02}
            />
          </mesh>

          {/* Neckline Opening & Collar Ring */}
          <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 24]} />
            <meshStandardMaterial
              color={activeColor.accentHex}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        </group>

        {/* ============================================================ */}
        {/* 3. 3D BELL SLEEVES WITH EMBROIDERED CUFFS                     */}
        {/* ============================================================ */}
        {/* Left Sleeve */}
        <group position={[-0.64, 0.28, 0]} rotation={[0, 0, Math.PI / 8.5]}>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[0.13, 0.17, 0.88, 18, 1, true]} />
            <meshStandardMaterial
              map={frontTexture}
              roughness={0.82}
              metalness={0.03}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Left Sleeve Embroidered Border Cuff */}
          <mesh position={[0, -0.84, 0]}>
            <cylinderGeometry args={[0.172, 0.174, 0.12, 18]} />
            <meshStandardMaterial
              color={activeColor.accentHex}
              roughness={0.75}
              metalness={0.05}
            />
          </mesh>
        </group>

        {/* Right Sleeve */}
        <group position={[0.64, 0.28, 0]} rotation={[0, 0, -Math.PI / 8.5]}>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[0.13, 0.17, 0.88, 18, 1, true]} />
            <meshStandardMaterial
              map={frontTexture}
              roughness={0.82}
              metalness={0.03}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Right Sleeve Embroidered Border Cuff */}
          <mesh position={[0, -0.84, 0]}>
            <cylinderGeometry args={[0.172, 0.174, 0.12, 18]} />
            <meshStandardMaterial
              color={activeColor.accentHex}
              roughness={0.75}
              metalness={0.05}
            />
          </mesh>
        </group>

        {/* ============================================================ */}
        {/* 4. DRAPED DUPATTA WITH HANGING CORNER TASSELS                */}
        {/* ============================================================ */}
        {/* Dupatta Shoulder Wrap */}
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.055, 12, 32, Math.PI]} />
          <meshStandardMaterial
            color={activeColor.accentHex}
            roughness={0.7}
            metalness={0.04}
          />
        </mesh>

        {/* Left Draped Dupatta Fall */}
        <mesh position={[-0.58, -0.56, 0.05]} rotation={[0, 0.08, 0.02]}>
          <boxGeometry args={[0.26, 1.95, 0.015]} />
          <meshStandardMaterial
            map={backTexture}
            roughness={0.75}
            metalness={0.03}
            transparent
            opacity={0.96}
          />
        </mesh>

        {/* Right Draped Dupatta Fall */}
        <mesh position={[0.58, -0.56, 0.05]} rotation={[0, -0.08, -0.02]}>
          <boxGeometry args={[0.26, 1.95, 0.015]} />
          <meshStandardMaterial
            map={backTexture}
            roughness={0.75}
            metalness={0.03}
            transparent
            opacity={0.96}
          />
        </mesh>

        {/* Handmade Corner Tassels */}
        {/* Left Tassel */}
        <group position={[-0.58, -1.58, 0.05]}>
          {/* Gold Bead Top */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial
              color="#D4AF37"
              metalness={0.92}
              roughness={0.2}
            />
          </mesh>
          {/* Dangling Silk Fringe */}
          <mesh position={[0, -0.07, 0]}>
            <coneGeometry args={[0.032, 0.11, 12]} />
            <meshStandardMaterial
              color={activeColor.accentHex}
              roughness={0.8}
              metalness={0.05}
            />
          </mesh>
        </group>

        {/* Right Tassel */}
        <group position={[0.58, -1.58, 0.05]}>
          {/* Gold Bead Top */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial
              color="#D4AF37"
              metalness={0.92}
              roughness={0.2}
            />
          </mesh>
          {/* Dangling Silk Fringe */}
          <mesh position={[0, -0.07, 0]}>
            <coneGeometry args={[0.032, 0.11, 12]} />
            <meshStandardMaterial
              color={activeColor.accentHex}
              roughness={0.8}
              metalness={0.05}
            />
          </mesh>
        </group>

        {/* ============================================================ */}
        {/* 5. SALWAR / TROUSERS (LOWER THREE-PIECE GARMENT)             */}
        {/* ============================================================ */}
        <group position={[0, -1.48, 0]}>
          {/* Left Trouser Leg */}
          <mesh position={[-0.24, -0.32, 0]}>
            <cylinderGeometry args={[0.16, 0.13, 0.72, 16]} />
            <meshStandardMaterial
              color={activeColor.accentHex}
              roughness={0.85}
              metalness={0.02}
            />
          </mesh>
          {/* Left Trouser Printed Cuff */}
          <mesh position={[-0.24, -0.66, 0]}>
            <cylinderGeometry args={[0.132, 0.132, 0.09, 16]} />
            <meshStandardMaterial
              color={activeColor.hex}
              roughness={0.8}
              metalness={0.05}
            />
          </mesh>

          {/* Right Trouser Leg */}
          <mesh position={[0.24, -0.32, 0]}>
            <cylinderGeometry args={[0.16, 0.13, 0.72, 16]} />
            <meshStandardMaterial
              color={activeColor.accentHex}
              roughness={0.85}
              metalness={0.02}
            />
          </mesh>
          {/* Right Trouser Printed Cuff */}
          <mesh position={[0.24, -0.66, 0]}>
            <cylinderGeometry args={[0.132, 0.132, 0.09, 16]} />
            <meshStandardMaterial
              color={activeColor.hex}
              roughness={0.8}
              metalness={0.05}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
