'use client';

import React from 'react';
import { FashionProduct3D, ColorVariant } from '@/types/fashion';
import { Garment3D } from './Garment3D';

interface SelectedProductViewProps {
  product: FashionProduct3D;
  activeColor: ColorVariant;
  manualRotationY: number;
}

export function SelectedProductView({
  product,
  activeColor,
  manualRotationY,
}: SelectedProductViewProps) {
  return (
    <group position={[-1.2, 0.25, 1.2]} scale={[1.28, 1.28, 1.28]}>
      <Garment3D
        product={product}
        activeColor={activeColor}
        isHovered={false}
        isSelected={true}
        position={[0, 0, 0]}
        manualRotationY={manualRotationY}
      />
    </group>
  );
}
