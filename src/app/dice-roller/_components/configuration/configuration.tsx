'use client';

import React, { useRef, useState } from 'react';
import { ActionIcon, Button, Group, Loader, Modal, Stack, Tabs, Text, useComputedColorScheme } from '@mantine/core';
import StatsConfig from './stats-config';
import ActionsConfig from './actions-config';
import DiceConfig from './dice-config';
import VisualsConfig from './visuals-config';
import { IconDiceFilled } from '@tabler/icons-react';
import type { ConfigPanelHandle } from '../../_types/types';
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

  const statsRef = useRef<ConfigPanelHandle>(null);
  const actionsRef = useRef<ConfigPanelHandle>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const getActiveRef = (tab: string): React.RefObject<ConfigPanelHandle | null> | null => {
    if (tab === 'stats') return statsRef;
    if (tab === 'actions') return actionsRef;
    return null;
  };

  const doTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem(LAST_TAB_KEY, value);
    setIsDirty(false);
  };

  const handleTabChange = (value: string | null) => {
    if (!value || value === activeTab) return;
    const ref = getActiveRef(activeTab);
    if (ref?.current?.isDirty()) {
      setPendingAction(() => () => doTabChange(value));
      return;
    }
    doTabChange(value);
  };

  const handleBack = () => {
    const ref = getActiveRef(activeTab);
    if (ref?.current?.isDirty()) {
      setPendingAction(() => () => toggleShowDiceBox());
      return;
    }
    toggleShowDiceBox();
  };

  const handleSave = () => {
    const ref = getActiveRef(activeTab);
    if (!ref?.current) return;
    setIsSaving(true);
    ref.current.save();
    setTimeout(() => {
      setIsSaving(false);
      setIsDirty(false);
    }, 700);
  };

  const handleModalSave = () => {
    const ref = getActiveRef(activeTab);
    ref?.current?.save();
    const action = pendingAction;
    setPendingAction(null);
    setIsDirty(false);
    action?.();
  };

  const handleModalDiscard = () => {
    const ref = getActiveRef(activeTab);
    ref?.current?.discard();
    const action = pendingAction;
    setPendingAction(null);
    setIsDirty(false);
    action?.();
  };

  const handleModalCancel = () => setPendingAction(null);

  const hasSaveButton = activeTab === 'stats' || activeTab === 'actions';

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
      <Modal
        opened={pendingAction !== null}
        onClose={handleModalCancel}
        title={t('common.unsavedChanges')}
        centered
        withinPortal={false}
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">{t('common.unsavedChangesMessage')}</Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={handleModalCancel}>{t('common.cancel')}</Button>
            <Button color="red" variant="light" onClick={handleModalDiscard}>{t('common.discard')}</Button>
            <Button color="green" onClick={handleModalSave}>{t('common.save')}</Button>
          </Group>
        </Stack>
      </Modal>

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
          <StatsConfig
            ref={statsRef}
            statSets={statSets}
            onUpdate={handleStatSetsUpdate}
            onDirtyChange={setIsDirty}
          />
        </Tabs.Panel>

        <Tabs.Panel value="actions" pt="xs">
          <ActionsConfig
            ref={actionsRef}
            actionSets={actionSets}
            statSets={statSets}
            onUpdate={handleActionSetsUpdate}
            onDirtyChange={setIsDirty}
          />
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
          padding: '0.75rem 1rem',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '80px',
          boxSizing: 'border-box',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <ActionIcon variant="light" size={48} onClick={handleBack} color="blue">
          <IconDiceFilled size={36} />
        </ActionIcon>

        {hasSaveButton && (
          <Button
            color="green"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            leftSection={isSaving ? <Loader size={14} color="white" /> : undefined}
            style={{ minWidth: 100 }}
          >
            {isSaving ? t('actions.save') + '…' : t('common.save')}
          </Button>
        )}
      </div>
    </div>
  );
};
