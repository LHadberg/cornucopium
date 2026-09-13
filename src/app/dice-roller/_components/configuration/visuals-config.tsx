'use client';

import { useState } from 'react';
import { Anchor, Button, Group, Slider, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconRefresh, IconSearch } from '@tabler/icons-react';
import { Canvas } from '@react-three/fiber';
import type { VisualConfig } from '../../_types/types';
import { defaultConfigs } from '../../_constants/default-configuration';
import { useTranslation } from 'react-i18next';
import NativeColorInput from './native-color-input';
import ColorPalette from './color-palette';
import { heroPatterns } from '../hero-patterns';
import { TrayLighting, TraySurface, TRAY_CAMERA } from '../tray-scene';
import styles from '../../_styles/VisualsConfig.module.css';

const patternOptions = heroPatterns.map(({ id, label, src, width, height }) => ({
  id, label, src, width, height,
})).sort((a, b) => a.label.localeCompare(b.label));

interface VisualsConfigProps {
  config: VisualConfig;
  onUpdate: (config: VisualConfig) => void;
}

export default function VisualsConfig({ config, onUpdate }: VisualsConfigProps) {
  const { t } = useTranslation();
  const [surface, setSurface] = useState<'wall' | 'background'>('wall');
  const [search, setSearch] = useState('');
  const isWall = surface === 'wall';
  const selectedStyle = isWall ? config.wallStyle : config.backgroundStyle;
  const color = isWall ? config.wallColor : config.backgroundColor;
  const repeat = isWall ? config.wallRepeat : config.backgroundRepeat;
  const choices = patternOptions;
  const filtered = choices.filter(({ label }) => label.toLowerCase().includes(search.toLowerCase().trim()));
  const selectedName = choices.find(({ id }) => id === selectedStyle)?.label ?? selectedStyle;
  const updateColor = (value: string) => onUpdate({ ...config, [isWall ? 'wallColor' : 'backgroundColor']: value });

  return (
    <Stack gap="lg">
      <div>
      </div>
      <div className={styles.editor}>
        <div className={styles.previewPanel}>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600}>{t('visuals.livePreview')}</Text>
              <Text size="xs" c="dimmed">{t('visuals.autoSaved')}</Text>
            </Group>
            <div className={styles.preview} role="img" aria-label={t('visuals.livePreview')}>
              <Canvas frameloop="demand" camera={{ ...TRAY_CAMERA, position: [0, 0, 5] }} gl={{ antialias: true }}>
                {/* Fit a smaller tray to this viewport for a close view of both surfaces. */}
                <TraySurface config={config} />
                <TrayLighting />
              </Canvas>
            </div>
          </div>
          <div className={styles.surfaces} role="group" aria-label={t('visuals.editSurface')}>
            {(['wall', 'background'] as const).map((value) => (
              <button key={value} type="button" className={styles.surface} aria-pressed={surface === value}
                onClick={() => { setSurface(value); setSearch(''); }}>
                <Group gap="xs">
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: value === 'wall' ? config.wallColor : config.backgroundColor }} />
                  <Text size="sm" fw={600}>{t(value === 'wall' ? 'visuals.walls' : 'visuals.background')}</Text>
                </Group>
              </button>
            ))}
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
          <div>
            <Text size="sm" fw={600} mb="xs">{t('visuals.chooseAColor')}</Text>
            <ColorPalette value={color} onChange={updateColor} />
            <div style={{ marginTop: 14 }}>
              <NativeColorInput key={surface} ariaLabel={t('visuals.customColor')} value={color} onChange={updateColor} />
            </div>
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
                <div className={styles.tile} style={{ backgroundColor: color }}>
                  <div className={styles.tileArt} style={{
                    maskImage: `url("${pattern.src}")`, maskRepeat: 'repeat',
                    maskSize: `${Math.min(pattern.width, 100)}px ${pattern.height * Math.min(1, 100 / pattern.width)}px`,
                  }} />
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
