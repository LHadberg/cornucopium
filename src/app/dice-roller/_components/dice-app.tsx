'use client';

import * as THREE from 'three';

import { PerspectiveCamera } from '@react-three/drei';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { ActionIcon, Center, Loader, MantineProvider, Slider, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { Configuration } from './configuration/configuration';
import { useLocalStorageConfiguration } from '../_hooks/use-local-storage-configuration';
import { defaultConfigs } from '../_constants/default-configuration';
import DiceBoxComponent from './dice-box';
import { getHeroPattern, usePatternSource } from './hero-patterns';
import { useSurfaceTexture } from '../_hooks/use-surface-texture';

// Initialize i18n (client-side only)
import '../_i18n/i18n';

interface DiceBoxContainerProps {
  onClick: () => void;
  configuration: ReturnType<typeof useLocalStorageConfiguration>;
}

// Three.js must recompile the material when an asynchronously loaded map
// changes it from an untextured surface to a textured one.
const updateSurfaceMaterial = (material: THREE.MeshStandardMaterial) => {
  material.needsUpdate = true;
};

const Thing: React.FC<DiceBoxContainerProps> = ({ configuration }) => {
  const ref = useRef<THREE.Mesh>(null);
  const {
    viewport: { width: viewportWidth, height: viewportHeight },
  } = useThree();
  const { wallStyle, wallRepeat, wallColor, backgroundColor, backgroundStyle, backgroundRepeat } = configuration.visualConfig;
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

// Inside-canvas component: camera + background only.
// Drives the DOM flip card directly via useFrame to avoid React re-render overhead.
interface DiceAppProps {
  configuration: ReturnType<typeof useLocalStorageConfiguration>;
  lighting: LightingConfig;
  isFlipped: boolean;
  flipCardRef: React.RefObject<HTMLDivElement | null>;
  onFlipRest: (flippedToBack: boolean) => void;
}

export const DiceApp: React.FC<DiceAppProps> = ({ configuration, lighting, isFlipped, flipCardRef, onFlipRest }) => {
  const isFlippedRef = useRef(isFlipped);
  isFlippedRef.current = isFlipped;

  const { rotation } = useSpring({
    rotation: isFlipped ? Math.PI : 0,
    config: { mass: 1, tension: 50, friction: 10, precision: 0.001 },
    onRest: () => {
      setTimeout(() => onFlipRest(isFlippedRef.current), 0);
    },
  });

  const cameraZOffset = rotation.to((r: number) => Math.sin(r) * 5);

  // Drive the DOM flip card directly — no React state update, no re-render.
  // Negated: CSS rotateY and Three.js Y-rotation appear opposite from the viewer.
  useFrame(() => {
    if (flipCardRef.current) {
      const deg = (rotation.get() / Math.PI) * 180;
      flipCardRef.current.style.transform = `rotateY(${-deg}deg)`;
    }
  });

  return (
    <>
      <animated.group rotation-y={rotation}>
        <animated.group position-z={cameraZOffset}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} lookAt={() => [0, 0, 10]} />
        </animated.group>
      </animated.group>
      <Thing onClick={() => {}} configuration={configuration} />
      <ambientLight intensity={lighting.ambientIntensity} />
      <pointLight position={[lighting.pointX, lighting.pointY, lighting.pointZ]} intensity={lighting.pointIntensity} />
    </>
  );
};

const DEFAULT_LIGHTING: LightingConfig = {
  ambientIntensity: 0.5,
  pointIntensity: 70,
  pointX: 0,
  pointY: 1,
  pointZ: 3,
};

function LightingDebugOverlay({
  lighting,
  onChange,
  onClose,
}: {
  lighting: LightingConfig;
  onChange: (next: LightingConfig) => void;
  onClose: () => void;
}) {
  const set = (key: keyof LightingConfig) => (v: number) =>
    onChange({ ...lighting, [key]: v });

  const rows: { label: string; key: keyof LightingConfig; min: number; max: number; step: number }[] = [
    { label: 'Ambient intensity', key: 'ambientIntensity', min: 0, max: 20, step: 0.1 },
    { label: 'Point intensity',   key: 'pointIntensity',   min: 0, max: 200, step: 1 },
    { label: 'Point X',           key: 'pointX',           min: -20, max: 20, step: 0.5 },
    { label: 'Point Y',           key: 'pointY',           min: -20, max: 20, step: 0.5 },
    { label: 'Point Z',           key: 'pointZ',           min: -20, max: 20, step: 0.5 },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 260,
        background: 'rgba(20,21,23,0.88)',
        backdropFilter: 'blur(6px)',
        borderRadius: 10,
        padding: '12px 16px 16px',
        zIndex: 100,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text size="sm" fw={600} c="white">Lighting Debug</Text>
        <ActionIcon size="xs" variant="subtle" color="gray" onClick={onClose}>
          <IconX size={12} />
        </ActionIcon>
      </div>
      <Stack gap={14}>
        {rows.map(({ label, key, min, max, step }) => (
          <div key={key}>
            <Text size="xs" c="dimmed" mb={4}>
              {label}: <span style={{ color: '#aaa' }}>{lighting[key].toFixed(step < 1 ? 1 : 0)}</span>
            </Text>
            <Slider
              value={lighting[key]}
              onChange={set(key)}
              min={min}
              max={max}
              step={step}
              size="xs"
              color="blue"
              styles={{
                track: { backgroundColor: 'rgba(255,255,255,0.15)' },
                label: { display: 'none' },
              }}
            />
          </div>
        ))}
      </Stack>
    </div>
  );
}

export const DiceAppWrapper = () => {
  const configuration = useLocalStorageConfiguration(defaultConfigs);
  const [lighting] = useState<LightingConfig>(DEFAULT_LIGHTING);
  const [ready, setReady] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const colorScheme = useComputedColorScheme('light');
  const canvasResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flip state
  const [isFlipped, setIsFlipped] = useState(false);
  const [diceBoxMounted, setDiceBoxMounted] = useState(false);
  const [configMounted, setConfigMounted] = useState(false);
  // Which side accepts pointer events (switches only after animation completes)
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'none'>('front');

  const flipCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDiceBoxMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: Parameters<typeof console.warn>) => {
      const msg = String(args[0] ?? '');
      if (msg.includes('Clock') && msg.includes('deprecated')) return;
      originalWarn.apply(console, args);
    };
    return () => { console.warn = originalWarn; };
  }, []);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    return () => {
      if (canvasResetTimerRef.current) clearTimeout(canvasResetTimerRef.current);
    };
  }, []);

  const toggle = useCallback(() => {
    setIsFlipped((prev) => {
      const next = !prev;
      if (next) {
        // Going to config — mount it if first visit, disable front interactions immediately
        setConfigMounted(true);
        setActiveSide('none');
      } else {
        // Going to dice — disable back interactions immediately
        setActiveSide('none');
      }
      return next;
    });
  }, []);

  const handleFlipRest = useCallback((flippedToBack: boolean) => {
    setActiveSide(flippedToBack ? 'back' : 'front');
  }, []);

  const handleCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor('#1a1b1e');
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (canvasResetTimerRef.current) clearTimeout(canvasResetTimerRef.current);
      canvasResetTimerRef.current = setTimeout(() => {
        setCanvasKey((k) => k + 1);
        canvasResetTimerRef.current = null;
      }, 500);
    });
  };

  const darkBg: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: '#1a1b1e',
  };

  if (!ready) {
    return (
      <div style={darkBg}>
        <Center style={{ height: '100%' }}>
          <Loader color="blue" size="xl" />
        </Center>
      </div>
    );
  }

  return (
    <div style={darkBg}>
      <Canvas
        key={canvasKey}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={handleCreated}
      >
        <DiceApp
          configuration={configuration}
          lighting={lighting}
          isFlipped={isFlipped}
          flipCardRef={flipCardRef}
          onFlipRest={handleFlipRest}
        />
      </Canvas>
      {/* DOM overlay: CSS 3D flip card — rendered outside the canvas so text is native and sharp */}
      <div style={{ position: 'absolute', inset: 0, perspective: '1200px', pointerEvents: 'none' }}>
        <div
          ref={flipCardRef}
          style={{
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front face: DiceBox */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            pointerEvents: activeSide === 'front' ? 'auto' : 'none',
          }}>
            <MantineProvider forceColorScheme={colorScheme}>
              {diceBoxMounted && (
                <DiceBoxComponent configuration={configuration} toggleShowDiceBox={toggle} isActive={activeSide === 'front'} />
              )}
            </MantineProvider>
          </div>

          {/* Back face: Configuration */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            padding: '1rem',
            boxSizing: 'border-box',
            pointerEvents: activeSide === 'back' ? 'auto' : 'none',
          }}>
            <MantineProvider forceColorScheme={colorScheme}>
              {configMounted && (
                <Configuration toggleShowDiceBox={toggle} configuration={configuration} isActive={activeSide === 'back'} />
              )}
            </MantineProvider>
          </div>
        </div>
      </div>

      {/* Lighting debug overlay — uncomment to enable
      {debugOpen ? (
        <LightingDebugOverlay ... />
      ) : ( ... )}
      */}
    </div>
  );
};
