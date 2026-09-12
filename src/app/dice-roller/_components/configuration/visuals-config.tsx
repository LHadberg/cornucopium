'use client';

import React, { useContext, useState } from 'react';
import { Anchor, Button, Group, Slider, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconRefresh, IconSearch } from '@tabler/icons-react';
import { Canvas } from '@react-three/fiber';
import type { VisualConfig } from '../../_types/types';
import { defaultConfigs } from '../../_constants/default-configuration';
import { useTranslation } from 'react-i18next';
import NativeColorInput from './native-color-input';
import { heroPatterns } from '../hero-patterns';
import { TrayAspectContext, TrayLighting, TraySurface, TRAY_CAMERA, TRAY_VIEW_HEIGHT } from '../tray-scene';
import styles from '../../_styles/VisualsConfig.module.css';

const PALETTE = ['#e8dfcf', '#c9ad82', '#8b7355', '#5b4034', '#852f42', '#b25c38', '#2d4a2d', '#347a76', '#345c89', '#655180', '#666c76', '#242831'];
const patternOptions = heroPatterns.map(({ id, label, src, width, height }) => ({
  id, label, src, width, height, hero: true,
})).sort((a, b) => a.label.localeCompare(b.label));

interface VisualsConfigProps {
  config: VisualConfig;
  onUpdate: (config: VisualConfig) => void;
}

export default function VisualsConfig({ config, onUpdate }: VisualsConfigProps) {
  const { t } = useTranslation();
  const [surface, setSurface] = useState<'wall' | 'background'>('wall');
  const [search, setSearch] = useState('');
  const aspect = useContext(TrayAspectContext);
  const isWall = surface === 'wall';
  const selectedStyle = isWall ? config.wallStyle : config.backgroundStyle;
  const color = isWall ? config.wallColor : config.backgroundColor;
  const repeat = isWall ? config.wallRepeat : config.backgroundRepeat;
  const builtins = [
    isWall
      ? { id: 'geometric', label: t('visuals.geometric'), src: '/dice-roller/textures/wall/geometric.svg', width: 64, height: 64, hero: false }
      : { id: 'diamond', label: t('visuals.diamond'), src: '/dice-roller/textures/background/diamond.svg', width: 64, height: 64, hero: false },
    { id: 'linen', label: t('visuals.linen'), src: '/dice-roller/textures/background/linen.svg', width: 16, height: 16, hero: false },
  ];
  const choices = [...builtins, ...patternOptions];
  const filtered = choices.filter(({ label }) => label.toLowerCase().includes(search.toLowerCase().trim()));
  const selectedName = choices.find(({ id }) => id === selectedStyle)?.label ?? selectedStyle;
  const updateColor = (value: string) => onUpdate({ ...config, [isWall ? 'wallColor' : 'backgroundColor']: value });
  // Match the rolling view's camera and world dimensions, even in a small preview.
  const height = TRAY_VIEW_HEIGHT;

  return (
    <Stack gap="lg">
      <div>
        <Text size="xl" fw={700}>{t('visuals.designTitle')}</Text>
        <Text size="sm" c="dimmed">{t('visuals.designDescription')}</Text>
      </div>
      <div className={styles.editor}>
        <div className={styles.previewPanel}>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600}>{t('visuals.livePreview')}</Text>
              <Text size="xs" c="dimmed">{t('visuals.autoSaved')}</Text>
            </Group>
            <div className={styles.preview} role="img" aria-label={t('visuals.livePreview')}>
              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                <div style={{ aspectRatio: aspect, width: `min(100%, ${210 * aspect}px)`, maxHeight: '100%' }}>
                  <Canvas frameloop="demand" camera={TRAY_CAMERA} gl={{ antialias: true }} style={{ aspectRatio: aspect }}>
                    <TraySurface config={config} dimensions={{ width: height * aspect, height }} />
                    <TrayLighting />
                  </Canvas>
                </div>
              </div>
            </div>
            <Text size="xs" c="dimmed" mt="xs">{t('visuals.previewLighting')}</Text>
          </div>
          <div className={styles.surfaces} role="group" aria-label={t('visuals.editSurface')}>
            {(['wall', 'background'] as const).map((value) => (
              <button key={value} type="button" className={styles.surface} aria-pressed={surface === value}
                onClick={() => { setSurface(value); setSearch(''); }}>
                <Group gap="xs">
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: value === 'wall' ? config.wallColor : config.backgroundColor }} />
                  <Text size="sm" fw={600}>{t(value === 'wall' ? 'visuals.walls' : 'visuals.floor')}</Text>
                </Group>
              </button>
            ))}
          </div>
          <div>
            <Text size="sm" fw={600} mb="xs">{t('visuals.colorPalette')}</Text>
            <div className={styles.palette}>
              {PALETTE.map((hex) => (
                <button key={hex} type="button" className={styles.swatch} style={{ backgroundColor: hex }}
                  aria-label={t('visuals.chooseColor', { color: hex })} aria-pressed={color.toLowerCase() === hex}
                  onClick={() => updateColor(hex)}>
                  {color.toLowerCase() === hex && <IconCheck size={16} color="white" style={{ filter: 'drop-shadow(0 1px 2px black)' }} />}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <NativeColorInput key={surface} label={t('visuals.customColor')} value={color} onChange={updateColor} />
            </div>
          </div>
          <div style={{ paddingBottom: 14 }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600}>{t('visuals.patternDensity')}</Text>
              <Text size="xs" c="dimmed">{repeat}×</Text>
            </Group>
            <Slider min={1} max={8} step={1} value={repeat} aria-label={t('visuals.patternDensity')}
              onChange={(value) => onUpdate({ ...config, [isWall ? 'wallRepeat' : 'backgroundRepeat']: value })}
              marks={[1, 2, 4, 8].map((value) => ({ value, label: String(value) }))} />
          </div>
          <Button variant="subtle" color="gray" size="xs" leftSection={<IconRefresh size={14} />} onClick={() => {
            const defaults = defaultConfigs.defaultVisualConfig;
            onUpdate(isWall
              ? { ...config, wallStyle: defaults.wallStyle, wallColor: defaults.wallColor, wallRepeat: defaults.wallRepeat }
              : { ...config, backgroundStyle: defaults.backgroundStyle, backgroundColor: defaults.backgroundColor, backgroundRepeat: defaults.backgroundRepeat });
          }}>{t('visuals.resetSurface')}</Button>
        </div>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" fw={600}>{t(isWall ? 'visuals.wallStyle' : 'visuals.backgroundStyle')}</Text>
            <Text size="xs" c="dimmed">{selectedName}</Text>
          </Group>
          <TextInput aria-label={t('visuals.searchPatterns')} placeholder={t('visuals.searchPatterns')}
            leftSection={<IconSearch size={16} />} value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
          <div className={styles.patterns} role="group" aria-label={t('visuals.patterns')}>
            {filtered.map((pattern) => (
              <button key={pattern.id} type="button" className={styles.pattern} aria-label={pattern.label}
                aria-pressed={selectedStyle === pattern.id}
                onClick={() => onUpdate({ ...config, [isWall ? 'wallStyle' : 'backgroundStyle']: pattern.id })}>
                <div className={styles.tile}>
                  {pattern.hero ? <div className={styles.tileArt} style={{
                    maskImage: `url("${pattern.src}")`, maskRepeat: 'repeat',
                    maskSize: `${Math.min(pattern.width, 100)}px ${pattern.height * Math.min(1, 100 / pattern.width)}px`,
                  }} /> : <div style={{ height: '100%', backgroundImage: `url("${pattern.src}")`, backgroundSize: `${pattern.width}px ${pattern.height}px` }} />}
                </div>
                <span className={styles.patternName}>{pattern.label}{selectedStyle === pattern.id && <IconCheck size={14} style={{ flexShrink: 0 }} />}</span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && <Text size="sm" c="dimmed" py="lg" ta="center">{t('visuals.noPatterns')}</Text>}
          <Text size="xs" c="dimmed">
            <Anchor href="https://heropatterns.com/" target="_blank" rel="noreferrer" inherit>Hero Patterns</Anchor>
            {' by Steve Schoger · '}
            <Anchor href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" inherit>CC BY 4.0</Anchor>
          </Text>
        </Stack>
      </div>
    </Stack>
  );
}
