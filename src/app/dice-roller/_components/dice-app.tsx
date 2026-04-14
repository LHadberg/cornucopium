'use client';

import * as THREE from 'three';

import { Html, PerspectiveCamera } from '@react-three/drei';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { Canvas, useLoader, useThree } from '@react-three/fiber';

import { ActionIcon, Center, Loader, MantineProvider, Slider, Stack, Text } from '@mantine/core';
import { IconBulb, IconX } from '@tabler/icons-react';
import { Configuration } from './configuration/configuration';
import { useLocalStorageConfiguration } from '../_hooks/use-local-storage-configuration';
import { defaultConfigs } from '../_constants/default-configuration';
import DiceBoxComponent from './dice-box';

// Initialize i18n (client-side only)
import '../_i18n/i18n';

interface DiceBoxContainerProps {
  onClick: () => void;
  configuration: ReturnType<typeof useLocalStorageConfiguration>;
}

const Thing: React.FC<DiceBoxContainerProps> = ({ configuration }) => {
  const ref = useRef<THREE.Mesh>(null);
  const {
    viewport: { width: viewportWidth, height: viewportHeight },
    size,
  } = useThree();
  const { wallStyle, wallRepeat, wallColor, backgroundColor, backgroundStyle, backgroundRepeat } = configuration.visualConfig;
  const wallThickness = 0.5;

  const wallMeshGeometric = useLoader(THREE.TextureLoader, '/dice-roller/textures/wall/geometric.svg');
  const wallMeshLinenWall = useLoader(THREE.TextureLoader, '/dice-roller/textures/background/linen.svg');
  const wallMesh = wallStyle === 'linen' ? wallMeshLinenWall : wallMeshGeometric;
  const backgroundMeshDiamond = useLoader(THREE.TextureLoader, '/dice-roller/textures/background/diamond.svg');
  const backgroundMeshLinen = useLoader(THREE.TextureLoader, '/dice-roller/textures/background/linen.svg');
  const backgroundMesh = backgroundStyle === 'linen' ? backgroundMeshLinen : backgroundMeshDiamond;

  const [wallMeshHorizontal, wallMeshVertical] = useMemo(() => {
    const h = wallMesh.clone();
    const v = wallMesh.clone();
    h.needsUpdate = true;
    v.needsUpdate = true;
    return [h, v];
  }, [wallMesh]);

  useEffect(() => {
    const wallBaseScale = wallStyle === 'linen' ? 4 : 1;

    if (wallMeshHorizontal) {
      wallMeshHorizontal.wrapS = wallMeshHorizontal.wrapT = THREE.RepeatWrapping;
      wallMeshHorizontal.repeat.set(viewportWidth * wallBaseScale * wallRepeat, wallThickness * wallBaseScale * wallRepeat);
      wallMeshHorizontal.needsUpdate = true;
    }

    if (wallMeshVertical) {
      wallMeshVertical.wrapS = wallMeshVertical.wrapT = THREE.RepeatWrapping;
      wallMeshVertical.repeat.set(wallThickness * wallBaseScale * wallRepeat, viewportHeight * wallBaseScale * wallRepeat);
      wallMeshVertical.needsUpdate = true;
    }

    const bgConfigs: [THREE.Texture, number, number][] = [
      [backgroundMeshDiamond, 1, 1],
      [backgroundMeshLinen,   4, 4],
    ];
    for (const [bg, sx, sy] of bgConfigs) {
      bg.wrapS = bg.wrapT = THREE.RepeatWrapping;
      bg.repeat.set(viewportWidth * sx * backgroundRepeat, viewportHeight * sy * backgroundRepeat);
      bg.needsUpdate = true;
    }
  }, [wallMeshHorizontal, wallMeshVertical, wallStyle, wallRepeat, backgroundMeshDiamond, backgroundMeshLinen, viewportHeight, viewportWidth, backgroundRepeat]);

  const wallMetalness = 0.2;
  const wallRoughness = 0.5;

  return (
    <group>
      {/* Top Wall */}
      <mesh position={[0, (viewportHeight - wallThickness) / 2, 0.5]}>
        <boxGeometry attach="geometry" args={[viewportWidth, 0.5, wallThickness]} />
        <meshStandardMaterial map={wallMeshHorizontal} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-(viewportWidth - wallThickness) / 2, 0, 0.5]}>
        <boxGeometry attach="geometry" args={[0.5, viewportHeight, wallThickness]} />
        <meshStandardMaterial map={wallMeshVertical} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[(viewportWidth - wallThickness) / 2, 0, 0.5]}>
        <boxGeometry attach="geometry" args={[0.5, viewportHeight, wallThickness]} />
        <meshStandardMaterial map={wallMeshVertical} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      {/* Bottom Wall */}
      <mesh position={[0, -(viewportHeight - wallThickness) / 2, 0.5]}>
        <boxGeometry attach="geometry" args={[viewportWidth, 0.5, wallThickness]} />
        <meshStandardMaterial map={wallMeshHorizontal} color={wallColor} metalness={wallMetalness} roughness={wallRoughness} />
      </mesh>
      {/* Background */}
      <mesh ref={ref} scale={[viewportWidth, viewportHeight, 1]}>
        <boxGeometry attach="geometry" args={[1, 1, 0.1]} />
        <meshStandardMaterial map={backgroundMesh} color={backgroundColor} roughness={0.7} metalness={0.8} />
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

interface DiceAppProps {
  configuration: ReturnType<typeof useLocalStorageConfiguration>;
  lighting: LightingConfig;
}

export const DiceApp: React.FC<DiceAppProps> = ({ configuration, lighting }) => {
  const { size, viewport } = useThree();

  const [isRotated, setIsRotated] = useState(false);

  const [showDiceBox, setShowDiceBox] = useState(true);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [diceBoxMounted, setDiceBoxMounted] = useState(false);
  const [configKey, setConfigKey] = useState(0);

  const { rotation } = useSpring({
    rotation: isRotated ? Math.PI : 0,
    config: {
      mass: 1,
      tension: 50,
      friction: 10,
      precision: 0.001,
    },
  });

  const cameraZOffset = rotation.to((r: number) => Math.sin(r) * 5);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDiceBoxMounted(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const toggleCamera = () => {
    setIsRotated(!isRotated);

    setTimeout(() => {
      setShowDiceBox(!showDiceBox);
      setShowConfiguration(!showConfiguration);
    }, 600);
  };

  useEffect(() => {
    if (!showConfiguration) return;
    const timer = setTimeout(() => setConfigKey((k) => k + 1), 520);
    return () => clearTimeout(timer);
  }, [showConfiguration]);

  const htmlScale = 0.4;
  const cameraZ = 10;
  const frontHtmlZ = 0.2;
  const dynamicDistanceFactor = 400 * (cameraZ - frontHtmlZ) * viewport.height / (htmlScale * cameraZ * size.height);

  const toggleShowDiceBox = (value?: React.SetStateAction<boolean> | undefined) => {
    const newValue = value !== undefined ?
      (typeof value === 'function' ? (value as Function)(showDiceBox) : value) :
      !showDiceBox;

    if (!isRotated) {
      toggleCamera();
    } else {
      setShowDiceBox(newValue);
      setShowConfiguration(!newValue);
    }
  };

  return (
    <>
      <animated.group rotation-y={rotation}>
        <animated.group position-z={cameraZOffset}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} lookAt={() => [0, 0, 10]} />
        </animated.group>
      </animated.group>
      <Thing
        onClick={toggleCamera}
        configuration={configuration}
      />

      <ambientLight intensity={lighting.ambientIntensity} />
      <pointLight position={[lighting.pointX, lighting.pointY, lighting.pointZ]} intensity={lighting.pointIntensity} />

      {/* DiceBox Component (frontside) */}
      {showDiceBox && diceBoxMounted && !isRotated && (
        <Html transform distanceFactor={dynamicDistanceFactor} scale={[0.4, 0.4, 1]} rotation={[0, 0, 0]} position={[0, 0, 0.2]}>
          <div
            style={{
              width: size.width,
              height: size.height,
              padding: '0',
            }}
          >
            <MantineProvider defaultColorScheme="auto">
              <DiceBoxComponent
                configuration={configuration}
                toggleShowDiceBox={toggleShowDiceBox}
              />
            </MantineProvider>
          </div>
        </Html>
      )}

      {/* Configuration Panel (backside) */}
      {showConfiguration && (
        <Html transform occlude distanceFactor={dynamicDistanceFactor} scale={[0.4, 0.4, 1]} rotation={[0, Math.PI, 0]} position={[0, 0, -0.1]}>
          <div style={{ width: size.width, height: size.height, overflow: 'hidden' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                padding: '1rem',
                boxSizing: 'border-box',
              }}
            >
              <MantineProvider defaultColorScheme="auto">
                <Configuration key={configKey} toggleShowDiceBox={toggleCamera} configuration={configuration} />
              </MantineProvider>
            </div>
          </div>
        </Html>
      )}
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
  // const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const handleCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor('#1a1b1e');
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      setReady(false);
      setTimeout(() => {
        setCanvasKey((k) => k + 1);
        setReady(true);
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
      <Canvas key={canvasKey} style={{ width: '100%', height: '100%', background: '#1a1b1e' }} onCreated={handleCreated}>
        <DiceApp configuration={configuration} lighting={lighting} />
      </Canvas>

      {/* Lighting debug overlay — uncomment to enable
      {debugOpen ? (
        <LightingDebugOverlay
          lighting={lighting}
          onChange={setLighting}
          onClose={() => setDebugOpen(false)}
        />
      ) : (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 100 }}>
          <ActionIcon
            size="md"
            variant="light"
            color="yellow"
            onClick={() => setDebugOpen(true)}
            title="Open lighting debug"
          >
            <IconBulb size={16} />
          </ActionIcon>
        </div>
      )}
      */}
    </div>
  );
};
