'use client';

import React from 'react';
import { Slider, Stack, Text } from '@mantine/core';
import type { DiceBoxConfig } from '../../_types/types';
import { useTranslation } from 'react-i18next';

interface PhysicsConfigProps {
  config: DiceBoxConfig;
  onUpdate: (config: DiceBoxConfig) => void;
}

const PhysicsConfig: React.FC<PhysicsConfigProps> = ({ config, onUpdate }) => {
  const { t } = useTranslation();

  const handleUpdate = (key: keyof DiceBoxConfig, value: number) => {
    onUpdate({
      ...config,
      [key]: value,
    });
  };

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>
        {t('physics.title')}
      </Text>
      <Stack gap="xs">
        <Text>{t('physics.gravity')}</Text>
        <Slider
          value={config.gravity}
          onChange={(value) => handleUpdate('gravity', value)}
          min={0}
          max={2}
          step={0.1}
          marks={[
            { value: 0, label: '0' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
          ]}
        />
      </Stack>
      <Stack gap="xs">
        <Text>{t('physics.mass')}</Text>
        <Slider
          value={config.mass}
          onChange={(value) => handleUpdate('mass', value)}
          min={0.1}
          max={2}
          step={0.1}
          marks={[
            { value: 0.1, label: t('physics.massLight') },
            { value: 1, label: t('physics.massNormal') },
            { value: 2, label: t('physics.massHeavy') },
          ]}
        />
      </Stack>
      <Stack gap="xs">
        <Text>{t('physics.friction')}</Text>
        <Slider
          value={config.friction}
          onChange={(value) => handleUpdate('friction', value)}
          min={0}
          max={1}
          step={0.1}
          marks={[
            { value: 0, label: t('physics.frictionNone') },
            { value: 0.5, label: t('physics.frictionMedium') },
            { value: 1, label: t('physics.frictionHigh') },
          ]}
        />
      </Stack>
    </Stack>
  );
};

export default PhysicsConfig;
