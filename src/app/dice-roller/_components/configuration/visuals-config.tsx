'use client';

import React, { useMemo } from 'react';
import { ActionIcon, Anchor, Group, Select, Slider, Stack, Text, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { VisualConfig } from '../../_types/types';
import { defaultConfigs } from '../../_constants/default-configuration';
import { useTranslation } from 'react-i18next';
import { wallGeometricSvgRaw, diamondSvgRaw, linenSvgRaw } from '../texture-data';
import NativeColorInput from './native-color-input';
import { getHeroPattern, heroPatterns } from '../hero-patterns';

const { defaultVisualConfig } = defaultConfigs;

const WALL_STYLES: Record<string, { svgRaw: string; baseColor: string; label: string; tileW: number; tileH: number }> = {
  geometric: { svgRaw: wallGeometricSvgRaw, baseColor: '#c49050', label: 'Geometric', tileW: 64, tileH: 64 },
  linen: { svgRaw: linenSvgRaw, baseColor: '#b8a080', label: 'Linen', tileW: 16, tileH: 16 },
};

const BACKGROUND_STYLES: Record<string, { svgRaw: string; baseColor: string; label: string; tileW: number; tileH: number }> = {
  diamond: { svgRaw: diamondSvgRaw, baseColor: '#a07848', label: 'Diamond', tileW: 64, tileH: 64 },
  linen: { svgRaw: linenSvgRaw, baseColor: '#b8a080', label: 'Linen', tileW: 16, tileH: 16 },
};

const patternOptions = heroPatterns.map(({ id, label }) => ({ value: id, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

function HeroPatternPreview({ id, color, repeat }: { id: string; color: string; repeat: number }) {
  const pattern = getHeroPattern(id);
  if (!pattern) return null;
  return (
    <div role="img" aria-label={pattern.label} style={{
      height: 64, width: '100%', borderRadius: 6, overflow: 'hidden', backgroundColor: color,
    }}>
      <div style={{
        height: '100%', backgroundColor: '#000', opacity: 0.25,
        maskImage: `url("${pattern.src}")`, maskRepeat: 'repeat',
        maskSize: `${pattern.width / repeat}px ${pattern.height / repeat}px`,
      }} />
    </div>
  );
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function recolorSvg(svgRaw: string, chosenHex: string, baseHex: string): string {
  const [ch, cs, cl] = hexToHsl(chosenHex);
  const [, bs, bl] = hexToHsl(baseHex);
  return svgRaw.replace(/#[0-9a-fA-F]{6}/g, (original) => {
    const [, os, ol] = hexToHsl(original);
    const newS = Math.max(0, Math.min(1, cs * (bs > 0 ? os / bs : 1)));
    const newL = Math.max(0, Math.min(1, cl * (bl > 0 ? ol / bl : 1)));
    return hslToHex(ch, newS, newL);
  });
}

const TexturePreview: React.FC<{ svgRaw: string; color: string; baseColor: string; tileW: number; tileH: number; repeat?: number }> = ({ svgRaw, color, baseColor, tileW, tileH, repeat = 1 }) => {
  const dataUrl = useMemo(() => {
    const svg = /^#[0-9a-fA-F]{6}$/.test(color) ? recolorSvg(svgRaw, color, baseColor) : svgRaw;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [svgRaw, color, baseColor]);

  return (
    <div style={{
      width: '100%',
      height: 64,
      flexShrink: 0,
      borderRadius: 6,
      backgroundImage: `url("${dataUrl}")`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${tileW / repeat}px ${tileH / repeat}px`,
    }} />
  );
};

interface VisualsConfigProps {
  config: VisualConfig;
  onUpdate: (config: VisualConfig) => void;
}

const VisualsConfig: React.FC<VisualsConfigProps> = ({ config, onUpdate }) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>
        {t('visuals.title')}
      </Text>
      <div>
        <Select
          label={t('visuals.wallStyle')}
          searchable
          allowDeselect={false}
          comboboxProps={{ withinPortal: false }}
          value={config.wallStyle}
          onChange={(value) => { if (value) onUpdate({ ...config, wallStyle: value }); }}
          data={[
            ...Object.entries(WALL_STYLES).map(([value, { label }]) => ({ value, label })),
            { group: 'Hero Patterns', items: patternOptions },
          ]}
        />
      </div>
      <div>
        <Text size="sm" fw={500} mb={4}>{t('visuals.wallRepeat')}</Text>
        <Text size="xs" c="dimmed" mb={8}>{t('visuals.wallRepeatDescription')}</Text>
        <Slider
          min={1}
          max={8}
          step={1}
          value={config.wallRepeat}
          onChange={(value) => onUpdate({ ...config, wallRepeat: value })}
          marks={[1, 2, 4, 8].map((v) => ({ value: v, label: String(v) }))}
        />
      </div>
      <Group align="flex-end" gap="xs">
        <NativeColorInput
          style={{ flex: 1 }}
          label={t('visuals.wallColor')}
          description={t('visuals.wallColorDescription')}
          value={config.wallColor}
          onChange={(value) => onUpdate({ ...config, wallColor: value })}
        />
        <Tooltip label={t('visuals.resetToDefault')} withinPortal={false}>
          <ActionIcon variant="default" size={36} style={{ alignSelf: 'flex-end' }} onClick={() => onUpdate({ ...config, wallColor: defaultVisualConfig.wallColor })}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {(() => {
        if (getHeroPattern(config.wallStyle)) return <HeroPatternPreview id={config.wallStyle} color={config.wallColor} repeat={config.wallRepeat} />;
        const style = WALL_STYLES[config.wallStyle] ?? { svgRaw: wallGeometricSvgRaw, baseColor: '#c49050', tileW: 64, tileH: 64 };
        return <TexturePreview svgRaw={style.svgRaw} color={config.wallColor} baseColor={style.baseColor} tileW={style.tileW} tileH={style.tileH} repeat={config.wallRepeat} />;
      })()}
      <div>
        <Select
          label={t('visuals.backgroundStyle')}
          searchable
          allowDeselect={false}
          comboboxProps={{ withinPortal: false }}
          value={config.backgroundStyle}
          onChange={(value) => { if (value) onUpdate({ ...config, backgroundStyle: value }); }}
          data={[
            ...Object.entries(BACKGROUND_STYLES).map(([value, { label }]) => ({ value, label })),
            { group: 'Hero Patterns', items: patternOptions },
          ]}
        />
      </div>
      <div>
        <Text size="sm" fw={500} mb={4}>{t('visuals.backgroundRepeat')}</Text>
        <Text size="xs" c="dimmed" mb={8}>{t('visuals.backgroundRepeatDescription')}</Text>
        <Slider
          min={1}
          max={8}
          step={1}
          value={config.backgroundRepeat}
          onChange={(value) => onUpdate({ ...config, backgroundRepeat: value })}
          marks={[1, 2, 4, 8].map((v) => ({ value: v, label: String(v) }))}
        />
      </div>
      <Group align="flex-end" gap="xs">
        <NativeColorInput
          style={{ flex: 1 }}
          label={t('visuals.backgroundColor')}
          description={t('visuals.backgroundColorDescription')}
          value={config.backgroundColor}
          onChange={(value) => onUpdate({ ...config, backgroundColor: value })}
        />
        <Tooltip label={t('visuals.resetToDefault')} withinPortal={false}>
          <ActionIcon variant="default" size={36} style={{ alignSelf: 'flex-end' }} onClick={() => onUpdate({ ...config, backgroundColor: defaultVisualConfig.backgroundColor })}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {(() => {
        if (getHeroPattern(config.backgroundStyle)) return <HeroPatternPreview id={config.backgroundStyle} color={config.backgroundColor} repeat={config.backgroundRepeat} />;
        const style = BACKGROUND_STYLES[config.backgroundStyle] ?? { svgRaw: diamondSvgRaw, baseColor: '#a07848', tileW: 64, tileH: 64 };
        return <TexturePreview svgRaw={style.svgRaw} color={config.backgroundColor} baseColor={style.baseColor} tileW={style.tileW} tileH={style.tileH} repeat={config.backgroundRepeat} />;
      })()}
      <Text size="xs" c="dimmed">
        <Anchor href="https://heropatterns.com/" target="_blank" rel="noreferrer" inherit>Hero Patterns</Anchor>
        {' by Steve Schoger · '}
        <Anchor href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" inherit>CC BY 4.0</Anchor>
      </Text>
    </Stack>
  );
};

export default VisualsConfig;
