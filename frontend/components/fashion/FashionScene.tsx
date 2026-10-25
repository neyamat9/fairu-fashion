'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { StudioCyc } from './StudioCyc';
import { ClothingRail } from './ClothingRail';
import { SelectedProductView } from './SelectedProductView';
import { FashionProduct3D, ColorVariant } from '@/types/fashion';

interface FashionSceneProps {
  products: FashionProduct3D[];
  hoveredProductId: string | null;
  selectedProductId: string | null;
  activeColorMap: Record<string, ColorVariant>;
  manualRotationY: number;
  onHoverProduct: (id: string | null) => void;
  onSelectProduct: (id: string) => void;
  onRotateDrag: (deltaX: number) => void;
}

export function FashionScene({
  products,
  hoveredProductId,
  selectedProductId,
  activeColorMap,
  manualRotationY,
  onHoverProduct,
  onSelectProduct,
  onRotateDrag,
}: FashionSceneProps) {
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const activeColor = selectedProduct
    ? activeColorMap[selectedProduct.id] ||
      selectedProduct.colors.find((c) => c.id === selectedProduct.defaultColorId) ||
      selectedProduct.colors[0]
    : undefined;

  // Pointer drag listeners for 360° inspection in selected mode
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!selectedProductId) return;
    isDragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !selectedProductId) return;
    const deltaX = e.clientX - lastX.current;
    lastX.current = e.clientX;
    onRotateDrag(deltaX * 0.012);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0.1, 7.8], fov: 38 }}
        dpr={[1, 2]} // Optimizes performance on high-DPI & Android devices
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Option 1: Luxury Editorial Studio Cyc & Lights */}
          <StudioCyc />

          {selectedProduct && activeColor ? (
            /* Selected Detail View: Centered Enlarged Dress with 360° Drag Rotation */
            <SelectedProductView
              product={selectedProduct}
              activeColor={activeColor}
              manualRotationY={manualRotationY}
            />
          ) : (
            /* Collection View: 5 Three-Piece Suits Spaced on the Brass Rail */
            <ClothingRail
              products={products}
              hoveredProductId={hoveredProductId}
              selectedProductId={selectedProductId}
              activeColorMap={activeColorMap}
              onHover={onHoverProduct}
              onSelect={onSelectProduct}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
