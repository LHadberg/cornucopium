'use client';

import React, { useMemo } from 'react';
import { ActionIcon, ColorInput, Group, SegmentedControl, Slider, Stack, Text, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { VisualConfig } from '../../_types/types';
import { defaultConfigs } from '../../_constants/default-configuration';
import { useTranslation } from 'react-i18next';
import { wallGeometricSvgRaw, diamondSvgRaw, linenSvgRaw } from '../texture-data';

const { defaultVisualConfig } = defaultConfigs;

const WALL_STYLES: Record<string, { svgRaw: string; baseColor: string; label: string; tileW: number; tileH: number }> = {
  geometric: { svgRaw: wallGeometricSvgRaw, baseColor: '#c49050', label: 'Geometric', tileW: 64, tileH: 64 },
  linen: { svgRaw: linenSvgRaw, baseColor: '#b8a080', label: 'Linen', tileW: 16, tileH: 16 },
};

const BACKGROUND_STYLES: Record<string, { svgRaw: string; baseColor: string; label: string; tileW: number; tileH: number }> = {
  diamond: { svgRaw: diamondSvgRaw, baseColor: '#a07848', label: 'Diamond', tileW: 64, tileH: 64 },
  linen: { svgRaw: linenSvgRaw, baseColor: '#b8a080', label: 'Linen', tileW: 16, tileH: 16 },
};

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
      <Group align="flex-end" gap="xs">
        <ColorInput
          style={{ flex: 1 }}
          label={t('visuals.diceColor')}
          description={t('visuals.diceColorDescription')}
          value={config.themeColor}
          onChange={(value) => onUpdate({ ...config, themeColor: value })}
          popoverProps={{ withinPortal: false }}
        />
        <Tooltip label={t('visuals.resetToDefault')} withinPortal={false}>
          <ActionIcon variant="default" size={36} onClick={() => onUpdate({ ...config, themeColor: defaultVisualConfig.themeColor })}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <div>
        <Text size="sm" fw={500} mb={4}>{t('visuals.wallStyle')}</Text>
        <SegmentedControl
          fullWidth
          value={config.wallStyle}
          onChange={(value) => onUpdate({ ...config, wallStyle: value })}
          data={Object.entries(WALL_STYLES).map(([value, { label }]) => ({ value, label }))}
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
        <ColorInput
          style={{ flex: 1 }}
          label={t('visuals.wallColor')}
          description={t('visuals.wallColorDescription')}
          value={config.wallColor}
          onChange={(value) => onUpdate({ ...config, wallColor: value })}
          popoverProps={{ withinPortal: false }}
        />
        <Tooltip label={t('visuals.resetToDefault')} withinPortal={false}>
          <ActionIcon variant="default" size={36} onClick={() => onUpdate({ ...config, wallColor: defaultVisualConfig.wallColor })}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {(() => {
        const style = WALL_STYLES[config.wallStyle] ?? { svgRaw: wallGeometricSvgRaw, baseColor: '#c49050', tileW: 64, tileH: 64 };
        return <TexturePreview svgRaw={style.svgRaw} color={config.wallColor} baseColor={style.baseColor} tileW={style.tileW} tileH={style.tileH} repeat={config.wallRepeat} />;
      })()}
      <div>
        <Text size="sm" fw={500} mb={4}>{t('visuals.backgroundStyle')}</Text>
        <SegmentedControl
          fullWidth
          value={config.backgroundStyle}
          onChange={(value) => onUpdate({ ...config, backgroundStyle: value })}
          data={Object.entries(BACKGROUND_STYLES).map(([value, { label }]) => ({ value, label }))}
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
        <ColorInput
          style={{ flex: 1 }}
          label={t('visuals.backgroundColor')}
          description={t('visuals.backgroundColorDescription')}
          value={config.backgroundColor}
          onChange={(value) => onUpdate({ ...config, backgroundColor: value })}
          popoverProps={{ withinPortal: false }}
        />
        <Tooltip label={t('visuals.resetToDefault')} withinPortal={false}>
          <ActionIcon variant="default" size={36} onClick={() => onUpdate({ ...config, backgroundColor: defaultVisualConfig.backgroundColor })}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {(() => {
        const style = BACKGROUND_STYLES[config.backgroundStyle] ?? { svgRaw: diamondSvgRaw, baseColor: '#a07848', tileW: 64, tileH: 64 };
        return <TexturePreview svgRaw={style.svgRaw} color={config.backgroundColor} baseColor={style.baseColor} tileW={style.tileW} tileH={style.tileH} repeat={config.backgroundRepeat} />;
      })()}
    </Stack>
  );
};

export default VisualsConfig;
