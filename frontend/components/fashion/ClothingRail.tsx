'use client';

import React from 'react';
import { FashionProduct3D, ColorVariant } from '@/types/fashion';
import { Garment3D } from './Garment3D';

interface ClothingRailProps {
  products: FashionProduct3D[];
  hoveredProductId: string | null;
  selectedProductId: string | null;
  activeColorMap: Record<string, ColorVariant>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function ClothingRail({
  products,
  hoveredProductId,
  selectedProductId,
  activeColorMap,
  onHover,
  onSelect,
}: ClothingRailProps) {
  const railColor = '#C5A059'; // Brushed Champagne Brass
  const spacing = 2.15; // Horizontal distance between garments
  const total = products.length;
  const startX = -((total - 1) * spacing) / 2;

  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================ */}
      {/* 1. BRUSHED BRASS / CHAMPAGNE GOLD HORIZONTAL RAIL            */}
      {/* ============================================================ */}
      <group position={[0, 1.88, 0]}>
        {/* Main Rail Bar */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.024, 0.024, 11.8, 32]} />
          <meshStandardMaterial
            color={railColor}
            metalness={0.88}
            roughness={0.22}
          />
        </mesh>

        {/* Left End Finial Cap */}
        <mesh position={[-5.92, 0, 0]}>
          <sphereGeometry args={[0.048, 20, 20]} />
          <meshStandardMaterial
            color={railColor}
            metalness={0.92}
            roughness={0.18}
          />
        </mesh>

        {/* Right End Finial Cap */}
        <mesh position={[5.92, 0, 0]}>
          <sphereGeometry args={[0.048, 20, 20]} />
          <meshStandardMaterial
            color={railColor}
            metalness={0.92}
            roughness={0.18}
          />
        </mesh>

        {/* Ceiling Suspension Cables (Left & Right) */}
        <mesh position={[-4.2, 1.8, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 3.6, 12]} />
          <meshStandardMaterial
            color={railColor}
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[4.2, 1.8, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 3.6, 12]} />
          <meshStandardMaterial
            color={railColor}
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* ============================================================ */}
      {/* 2. FIVE LUXURY THREE-PIECE SUITS ON THE RAIL                 */}
      {/* ============================================================ */}
      {products.map((product, idx) => {
        const xPos = startX + idx * spacing;
        const isHovered = hoveredProductId === product.id;
        const isSelected = selectedProductId === product.id;
        const activeColor =
          activeColorMap[product.id] ||
          product.colors.find((c) => c.id === product.defaultColorId) ||
          product.colors[0];

        // If a product is selected, non-selected garments slide away softly
        let garmentX = xPos;
        let garmentOpacity = 1.0;
        if (selectedProductId && !isSelected) {
          garmentX = xPos < 0 ? xPos - 3.5 : xPos + 3.5;
          garmentOpacity = 0.2;
        }

        return (
          <group key={product.id} visible={garmentOpacity > 0.05}>
            <Garment3D
              product={product}
              activeColor={activeColor}
              isHovered={isHovered}
              isSelected={isSelected}
              position={[garmentX, 0.42, 0]}
              onHover={onHover}
              onClick={onSelect}
            />
          </group>
        );
      })}
    </group>
  );
}
