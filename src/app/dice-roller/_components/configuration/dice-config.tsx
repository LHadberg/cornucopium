'use client';

import React from 'react';
import { ActionIcon, Group, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { DiceBoxConfig, VisualConfig } from '../../_types/types';
import { DICE_SIZE_PRESETS, DICE_WEIGHT_PRESETS, defaultConfigs } from '../../_constants/default-configuration';
import { useTranslation } from 'react-i18next';
import NativeColorInput from './native-color-input';

type DiceWeight = 'light' | 'medium' | 'heavy';
type DiceSize = 'small' | 'medium' | 'large';

const DICE_THEMES = ['default', 'rust'] as const;
type DiceTheme = typeof DICE_THEMES[number];

function detectWeight(config: DiceBoxConfig): DiceWeight {
  for (const key of ['light', 'medium', 'heavy'] as DiceWeight[]) {
    const preset = DICE_WEIGHT_PRESETS[key];
    if (
      config.gravity === preset.gravity &&
      config.mass === preset.mass &&
      config.friction === preset.friction &&
      config.restitution === preset.restitution &&
      config.linearDamping === preset.linearDamping &&
      config.angularDamping === preset.angularDamping
    ) return key;
  }
  return 'medium';
}

function detectSize(scale: number): DiceSize {
  for (const key of ['small', 'medium', 'large'] as DiceSize[]) {
    if (DICE_SIZE_PRESETS[key] === scale) return key;
  }
  return 'medium';
}

interface DiceConfigProps {
  physicsConfig: DiceBoxConfig;
  visualConfig: VisualConfig;
  onPhysicsUpdate: (config: DiceBoxConfig) => void;
  onVisualsUpdate: (config: VisualConfig) => void;
}

const DiceConfig: React.FC<DiceConfigProps> = ({ physicsConfig, visualConfig, onPhysicsUpdate, onVisualsUpdate }) => {
  const { t } = useTranslation();
  const weight = detectWeight(physicsConfig);
  const size = detectSize(visualConfig.scale ?? 6);
  const theme = DICE_THEMES.includes(visualConfig.theme as DiceTheme) ? visualConfig.theme as DiceTheme : 'default';

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>{t('dice.title')}</Text>
      <div>
        <Text size="sm" fw={500} mb={4}>{t('dice.diceWeight')}</Text>
        <SegmentedControl
          fullWidth
          value={weight}
          onChange={(v) => onPhysicsUpdate(DICE_WEIGHT_PRESETS[v as DiceWeight])}
          data={[
            { value: 'light', label: t('dice.light') },
            { value: 'medium', label: t('dice.medium') },
            { value: 'heavy', label: t('dice.heavy') },
          ]}
        />
      </div>
      <div>
        <Text size="sm" fw={500} mb={4}>{t('dice.diceSize')}</Text>
        <SegmentedControl
          fullWidth
          value={size}
          onChange={(v) => onVisualsUpdate({ ...visualConfig, scale: DICE_SIZE_PRESETS[v as DiceSize] })}
          data={[
            { value: 'small', label: t('dice.small') },
            { value: 'medium', label: t('dice.medium') },
            { value: 'large', label: t('dice.large') },
          ]}
        />
      </div>
      <div>
        <Text size="sm" fw={500} mb={4}>{t('dice.diceTheme')}</Text>
        <SegmentedControl
          fullWidth
          value={theme}
          onChange={(v) => onVisualsUpdate({ ...visualConfig, theme: v })}
          data={[
            { value: 'default', label: t('dice.themeDefault') },
            { value: 'rust', label: t('dice.themeRust') },
          ]}
        />
      </div>
      <Group align="flex-end" gap="xs">
        <NativeColorInput
          style={{ flex: 1 }}
          label={t('dice.diceColor')}
          description={t('dice.diceColorDescription')}
          value={visualConfig.themeColor}
          onChange={(value) => onVisualsUpdate({ ...visualConfig, themeColor: value })}
        />
        <Tooltip label={t('visuals.resetToDefault')} withinPortal={false}>
          <ActionIcon
            variant="default"
            size={36}
            style={{ alignSelf: 'flex-end' }}
            onClick={() => onVisualsUpdate({ ...visualConfig, themeColor: defaultConfigs.defaultVisualConfig.themeColor })}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  );
};

export default DiceConfig;
