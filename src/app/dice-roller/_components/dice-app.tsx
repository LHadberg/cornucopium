'use client';

import type * as THREE from 'three';

import { PerspectiveCamera } from '@react-three/drei';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { Canvas, useFrame } from '@react-three/fiber';

import { ActionIcon, Center, Loader, MantineProvider, Slider, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { Configuration } from './configuration/configuration';
import { useLocalStorageConfiguration } from '../_hooks/use-local-storage-configuration';
import { defaultConfigs } from '../_constants/default-configuration';
import DiceBoxComponent from './dice-box';
import { useElementSize } from '@mantine/hooks';
import { TraySurface, TrayLighting, TrayAspectContext, TRAY_CAMERA, DEFAULT_LIGHTING, type LightingConfig } from './tray-scene';

// Initialize i18n (client-side only)
import '../_i18n/i18n';

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
          <PerspectiveCamera makeDefault {...TRAY_CAMERA} />
        </animated.group>
      </animated.group>
      <TraySurface config={configuration.visualConfig} />
      <TrayLighting lighting={lighting} />
    </>
  );
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
  const { ref: trayRef, width: trayWidth, height: trayHeight } = useElementSize();
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
    <TrayAspectContext.Provider value={trayWidth > 0 && trayHeight > 0 ? trayWidth / trayHeight : 16 / 9}>
    <div ref={trayRef} style={darkBg}>
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
    </TrayAspectContext.Provider>
  );
};
