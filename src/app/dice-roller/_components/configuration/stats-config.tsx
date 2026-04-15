'use client';

import React from 'react';
import { Group, Stack, Text, ActionIcon, Paper } from '@mantine/core';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import type { Stats } from '../../_types/types';
import { useTranslation } from 'react-i18next';

interface StatsConfigProps {
  stats: Stats;
  onUpdate: (stats: Stats) => void;
}

const calculateModifier = (value: number): number => {
  return Math.floor((value - 10) / 2);
};

const StatsConfig: React.FC<StatsConfigProps> = ({ stats, onUpdate }) => {
  const { t } = useTranslation();

  const handleStatChange = (statKey: keyof Stats, change: number) => {
    const newValue = stats[statKey].value + change;
    if (newValue >= 0 && newValue <= 20) {
      onUpdate({
        ...stats,
        [statKey]: {
          ...stats[statKey],
          value: newValue,
          modifier: calculateModifier(newValue),
        },
      });
    }
  };

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>{t('stats.title')}</Text>
      {(Object.keys(stats) as Array<keyof Stats>).map((statKey) => (
        <Paper key={statKey} p="md" withBorder>
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">
              {t(`statNames.${statKey}`)}
            </Text>
            <Text size="sm" c="dimmed">
              {t('stats.valueModifier', {
                value: stats[statKey].value,
                modifier: `${stats[statKey].modifier >= 0 ? '+' : ''}${stats[statKey].modifier}`,
              })}
            </Text>
            <Group>
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => handleStatChange(statKey, -1)}
                disabled={stats[statKey].value <= 0}
              >
                <IconMinus size={16} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => handleStatChange(statKey, 1)}
                disabled={stats[statKey].value >= 20}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
};

export default StatsConfig;
