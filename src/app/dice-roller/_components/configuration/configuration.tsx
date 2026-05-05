'use client';

import React, { useState } from 'react';
import { ActionIcon, Group, Tabs, useComputedColorScheme } from '@mantine/core';
import StatsConfig from './stats-config';
import ActionsConfig from './actions-config';
import DiceConfig from './dice-config';
import VisualsConfig from './visuals-config';
import { IconDiceFilled } from '@tabler/icons-react';
import type { LocalStorageConfigurationReturn } from '../../_hooks/use-local-storage-configuration';
import { useTranslation } from 'react-i18next';
import styles from '../../_styles/Configuration.module.css';

const LAST_TAB_KEY = 'dice-roller-last-config-tab';

export interface ConfigurationProps {
  toggleShowDiceBox: (value?: React.SetStateAction<boolean> | undefined) => void;
  configuration: LocalStorageConfigurationReturn;
}

export const Configuration: React.FC<ConfigurationProps> = ({ toggleShowDiceBox, configuration }) => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const { t } = useTranslation();

  const { statSets, actionSets, physicsConfig, visualConfig, handleStatSetsUpdate, handleActionSetsUpdate, handlePhysicsUpdate, handleVisualsUpdate } = configuration;
  const tabs = {
    stats:   { key: 'stats',    label: t('tabs.stats') },
    actions: { key: 'actions',  label: t('tabs.actions') },
    dice:    { key: 'dice',     label: t('tabs.dice') },
    diceBox: { key: 'dice-box', label: t('tabs.diceBox') },
  };

  const validKeys = Object.values(tabs).map(t => t.key);
  const savedTab = typeof window !== 'undefined' ? localStorage.getItem(LAST_TAB_KEY) : null;
  const [activeTab, setActiveTab] = useState<string>(
    savedTab && validKeys.includes(savedTab) ? savedTab : tabs.stats.key
  );

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      localStorage.setItem(LAST_TAB_KEY, value);
    }
  };

  return (
    <div
      className={styles.configWrapper}
      onClick={(e) => { e.stopPropagation(); }}
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? 'rgba(26, 27, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        maxHeight: '100%',
        overflow: 'hidden',
        borderRadius: '12px',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
      }}
    >
      <Tabs
        styles={{
          root: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            maxHeight: 'calc(100% - 80px)',
          },
          panel: {
            maxWidth: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: 1,
            minHeight: 0,
            padding: '0 1rem',
          },
        }}
        value={activeTab}
        onChange={handleTabChange}
        p={'1rem'}
      >
        <Group justify="space-between" align="center" mb="xs">
          <Tabs.List style={{ flex: 1 }}>
            {Object.values(tabs).map((tab) => (
              <Tabs.Tab key={tab.key} value={tab.key}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Group>

        <Tabs.Panel value="stats" pt="xs">
          <StatsConfig statSets={statSets} onUpdate={handleStatSetsUpdate} />
        </Tabs.Panel>

        <Tabs.Panel value="actions" pt="xs">
          <ActionsConfig actionSets={actionSets} statSets={statSets} onUpdate={handleActionSetsUpdate} />
        </Tabs.Panel>

        <Tabs.Panel value="dice" pt="xs">
          <DiceConfig
            physicsConfig={physicsConfig}
            visualConfig={visualConfig}
            onPhysicsUpdate={handlePhysicsUpdate}
            onVisualsUpdate={handleVisualsUpdate}
          />
        </Tabs.Panel>

        <Tabs.Panel value="dice-box" pt="xs">
          <VisualsConfig config={visualConfig} onUpdate={handleVisualsUpdate} />
        </Tabs.Panel>
      </Tabs>
      <div
        style={{
          padding: '1rem',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          height: '80px',
          boxSizing: 'border-box',
        }}
      >
        <ActionIcon variant="light" size={48} onClick={() => toggleShowDiceBox()} color="blue">
          <IconDiceFilled size={36} />
        </ActionIcon>
      </div>
    </div>
  );
};
