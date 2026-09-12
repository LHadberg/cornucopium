'use client';

import * as THREE from 'three';
import { createContext, useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { VisualConfig } from '../_types/types';
import { getHeroPattern, usePatternSource } from './hero-patterns';
import { useSurfaceTexture } from '../_hooks/use-surface-texture';

export const TrayAspectContext = createContext(16 / 9);
export const TRAY_CAMERA = { position: [0, 0, 10] as [number, number, number], fov: 50 };
export const TRAY_VIEW_HEIGHT = 2 * Math.tan(TRAY_CAMERA.fov * Math.PI / 360) * TRAY_CAMERA.position[2];

// Three.js must recompile the material when an asynchronously loaded map
// changes it from an untextured surface to a textured one.
const updateSurfaceMaterial = (material: THREE.MeshStandardMaterial) => {
  material.needsUpdate = true;
};

export const TraySurface = ({ config, dimensions }: { config: VisualConfig; dimensions?: { width: number; height: number } }) => {
  const ref = useRef<THREE.Mesh>(null);
  const {
    viewport,
  } = useThree();
  const { width: viewportWidth, height: viewportHeight } = dimensions ?? viewport;
  const { wallStyle, wallRepeat, wallColor, backgroundColor, backgroundStyle, backgroundRepeat } = config;
  const wallThickness = 0.5;

  const wallSource = usePatternSource(wallStyle, wallStyle === 'linen'
    ? '/dice-roller/textures/background/linen.svg' : '/dice-roller/textures/wall/geometric.svg');
  const backgroundSource = usePatternSource(backgroundStyle, backgroundStyle === 'linen'
    ? '/dice-roller/textures/background/linen.svg' : '/dice-roller/textures/background/diamond.svg');
  const wallMesh = useSurfaceTexture(wallSource);
  const backgroundOriginal = useSurfaceTexture(backgroundSource);
  const backgroundMesh = useMemo(() => {
    if (!backgroundOriginal) return null;
    const texture = backgroundOriginal.clone();
    texture.needsUpdate = true;
    return texture;
  }, [backgroundOriginal]);

  const [wallMeshHorizontal, wallMeshVertical] = useMemo(() => {
    if (!wallMesh) return [null, null];
    const h = wallMesh.clone();
    const v = wallMesh.clone();
    h.needsUpdate = true;
    v.needsUpdate = true;
    return [h, v];
  }, [wallMesh]);

  useEffect(() => () => {
    wallMeshHorizontal?.dispose();
    wallMeshVertical?.dispose();
  }, [wallMeshHorizontal, wallMeshVertical]);

  useEffect(() => () => backgroundMesh?.dispose(), [backgroundMesh]);

  useEffect(() => {
    const wallBaseScale = wallStyle === 'linen' ? 4 : 1;
    const wallPattern = getHeroPattern(wallStyle);
    const wallScaleX = wallPattern ? 64 / wallPattern.width : wallBaseScale;
    const wallScaleY = wallPattern ? 64 / wallPattern.height : wallBaseScale;

    if (wallMeshHorizontal) {
      wallMeshHorizontal.wrapS = wallMeshHorizontal.wrapT = THREE.RepeatWrapping;
      wallMeshHorizontal.repeat.set(viewportWidth * wallScaleX * wallRepeat, wallThickness * wallScaleY * wallRepeat);
      wallMeshHorizontal.needsUpdate = true;
    }

    if (wallMeshVertical) {
      wallMeshVertical.wrapS = wallMeshVertical.wrapT = THREE.RepeatWrapping;
      wallMeshVertical.repeat.set(wallThickness * wallScaleX * wallRepeat, viewportHeight * wallScaleY * wallRepeat);
      wallMeshVertical.needsUpdate = true;
    }

    const backgroundPattern = getHeroPattern(backgroundStyle);
    const backgroundBaseScale = backgroundStyle === 'linen' ? 4 : 1;
    const sx = backgroundPattern ? 64 / backgroundPattern.width : backgroundBaseScale;
    const sy = backgroundPattern ? 64 / backgroundPattern.height : backgroundBaseScale;
    if (backgroundMesh) {
      backgroundMesh.wrapS = backgroundMesh.wrapT = THREE.RepeatWrapping;
      backgroundMesh.repeat.set(viewportWidth * sx * backgroundRepeat, viewportHeight * sy * backgroundRepeat);
      backgroundMesh.needsUpdate = true;
    }
  }, [wallMeshHorizontal, wallMeshVertical, wallStyle, wallRepeat, backgroundMesh, backgroundStyle, viewportHeight, viewportWidth, backgroundRepeat]);

  const wallMetalness = 0.2;
  const wallRoughness = 0.5;

  return (
    <group>
      <mesh position={[0, (viewportHeight - wallThickness) / 2, 0.5]}>
        <boxGeometry attach="geometry" args={[viewportWidth, 0.5, wallThickness]} />
        <meshStandardMaterial onUpdate={updateSurfaceMaterial} map={wallMeshHorizontal} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      <mesh position={[-(viewportWidth - wallThickness) / 2, 0, 0.5]}>
        <boxGeometry attach="geometry" args={[0.5, viewportHeight, wallThickness]} />
        <meshStandardMaterial onUpdate={updateSurfaceMaterial} map={wallMeshVertical} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      <mesh position={[(viewportWidth - wallThickness) / 2, 0, 0.5]}>
        <boxGeometry attach="geometry" args={[0.5, viewportHeight, wallThickness]} />
        <meshStandardMaterial onUpdate={updateSurfaceMaterial} map={wallMeshVertical} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      <mesh position={[0, -(viewportHeight - wallThickness) / 2, 0.5]}>
        <boxGeometry attach="geometry" args={[viewportWidth, 0.5, wallThickness]} />
        <meshStandardMaterial onUpdate={updateSurfaceMaterial} map={wallMeshHorizontal} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      <mesh ref={ref} scale={[viewportWidth, viewportHeight, 1]}>
        <boxGeometry attach="geometry" args={[1, 1, 0.1]} />
        <meshStandardMaterial onUpdate={updateSurfaceMaterial} map={backgroundMesh} color={backgroundColor} roughness={0.7} metalness={0.8} />
      </mesh>
    </group>
  );
};

export interface LightingConfig {
  ambientIntensity: number;
  pointIntensity: number;
  pointX: number;
  pointY: number;
  pointZ: number;
}

export const DEFAULT_LIGHTING: LightingConfig = {
  ambientIntensity: 0.5,
  pointIntensity: 70,
  pointX: 0,
  pointY: 1,
  pointZ: 3,
};


export function TrayLighting({ lighting = DEFAULT_LIGHTING }: { lighting?: LightingConfig }) {
  return <>
    <ambientLight intensity={lighting.ambientIntensity} />
    <pointLight position={[lighting.pointX, lighting.pointY, lighting.pointZ]} intensity={lighting.pointIntensity} />
  </>;
}
