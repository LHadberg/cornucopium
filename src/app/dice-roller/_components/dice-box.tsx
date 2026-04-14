'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Text,
  Group,
  ActionIcon,
  Center,
  Loader,
  Drawer,
  Transition,
  SimpleGrid,
  Paper,
  Stack,
  Badge,
  UnstyledButton,
  Tooltip,
} from '@mantine/core';
import DiceBox from '@3d-dice/dice-box';
import type { Action, DiceResult } from '../_types/types';
import {
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react';
import styles from '../_styles/DiceBox.module.css';
import type { LocalStorageConfigurationReturn } from '../_hooks/use-local-storage-configuration';
import { useTranslation } from 'react-i18next';
import D20Icon from './D20Icon';

declare global {
  interface Window {
    __DICEBOX_AMMO_INIT__?: boolean;
  }
}

const DAMAGE_TYPE_STYLES: Record<string, { backgroundColor: string; borderColor: string }> = {
  acid:        { backgroundColor: 'rgba(139, 195, 74, 0.2)',  borderColor: '#8bc34a' },
  bludgeoning: { backgroundColor: 'rgba(121, 85, 72, 0.2)',   borderColor: '#795548' },
  cold:        { backgroundColor: 'rgba(79, 195, 247, 0.2)',  borderColor: '#4fc3f7' },
  fire:        { backgroundColor: 'rgba(255, 87, 34, 0.2)',   borderColor: '#ff5722' },
  force:       { backgroundColor: 'rgba(224, 64, 251, 0.2)',  borderColor: '#e040fb' },
  lightning:   { backgroundColor: 'rgba(255, 235, 59, 0.2)',  borderColor: '#ffeb3b' },
  necrotic:    { backgroundColor: 'rgba(55, 71, 79, 0.3)',    borderColor: '#546e7a' },
  piercing:    { backgroundColor: 'rgba(120, 144, 156, 0.2)', borderColor: '#78909c' },
  poison:      { backgroundColor: 'rgba(123, 31, 162, 0.2)',  borderColor: '#7b1fa2' },
  psychic:     { backgroundColor: 'rgba(240, 98, 146, 0.2)',  borderColor: '#f06292' },
  radiant:     { backgroundColor: 'rgba(255, 214, 0, 0.2)',   borderColor: '#ffd600' },
  slashing:    { backgroundColor: 'rgba(239, 83, 80, 0.2)',   borderColor: '#ef5350' },
  thunder:     { backgroundColor: 'rgba(126, 87, 194, 0.2)',  borderColor: '#7e57c2' },
};
const STAT_STYLES: Record<string, { backgroundColor: string; borderColor: string }> = {
  strength:     { backgroundColor: 'rgba(244, 67, 54, 0.2)',  borderColor: '#f44336' },
  dexterity:    { backgroundColor: 'rgba(76, 175, 80, 0.2)',  borderColor: '#4caf50' },
  constitution: { backgroundColor: 'rgba(255, 152, 0, 0.2)',  borderColor: '#ff9800' },
  intelligence: { backgroundColor: 'rgba(33, 150, 243, 0.2)', borderColor: '#2196f3' },
  wisdom:       { backgroundColor: 'rgba(0, 188, 212, 0.2)',  borderColor: '#00bcd4' },
  charisma:     { backgroundColor: 'rgba(156, 39, 176, 0.2)', borderColor: '#9c27b0' },
};

if (typeof window !== 'undefined' && !window.__DICEBOX_AMMO_INIT__) {
  window.__DICEBOX_AMMO_INIT__ = false;
}

export interface DiceBoxProps {
  configuration: LocalStorageConfigurationReturn;
  toggleShowDiceBox: () => void;
}

const DiceBoxComponent: React.FC<DiceBoxProps> = ({
  configuration,
  toggleShowDiceBox,
}) => {
  const { actions, physicsConfig, visualConfig, stats } = configuration;

  const { t } = useTranslation();

  const [results, setResults] = useState<DiceResult[]>([]);
  const [showActions, setShowActions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [isDamageRoll, setIsDamageRollState] = useState(false);
  const [activeStatModifier, setActiveStatModifier] = useState<{ stat: keyof typeof stats; value: number } | null>(null);

  const isDamageRollRef = useRef<boolean>(isDamageRoll);
  const diceBoxRef = useRef<InstanceType<typeof DiceBox> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const updatingRef = useRef<boolean>(false);

  const [attackHitPrompt, setAttackHitPrompt] = useState<{ action: Action; value: number } | null>(null);
  const rollPhaseRef = useRef<'attack' | 'normal'>('normal');
  const pendingActionRef = useRef<Action | null>(null);
  const currentDamageTypesRef = useRef<string[]>([]);
  const currentStatModifierRef = useRef<keyof typeof stats | null>(null);

  const [lastAction, setLastAction] = useState<Action | null>(null);

  const physicsRef = useRef(configuration.physicsConfig);
  const visualRef = useRef(configuration.visualConfig);
  const statsRef = useRef(stats);
  physicsRef.current = physicsConfig;
  visualRef.current = visualConfig;
  statsRef.current = stats;

  const setIsDamageRoll = (v: boolean) => {
    isDamageRollRef.current = v;
    setIsDamageRollState(v);
  };

  const containerId = useRef('dice-container-' + Math.random().toString(36).slice(2));

  const updateCanvasSize = useCallback(() => {
    if (updatingRef.current) return;
    updatingRef.current = true;

    const container = document.getElementById(containerId.current);
    if (!container) {
      updatingRef.current = false;
      return;
    }

    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      updatingRef.current = false;
      return;
    }

    canvas.style.width = '100%';
    canvas.style.height = '100%';

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      updatingRef.current = false;
    });
  }, []);

  const initializeDiceBox = useCallback(async () => {
    if (!containerRef.current) return;

    if (window.__DICEBOX_AMMO_INIT__ && diceBoxRef.current) {
      return;
    }

    if (diceBoxRef.current) return;

    try {
      const box = new DiceBox({
        container: `#${containerId.current}`,
        assetPath: '/assets/dice-box/',
        theme: visualRef.current.theme,
        themeColor: visualRef.current.themeColor,
        scale: 6,
        gravity: physicsRef.current.gravity,
        mass: physicsRef.current.mass,
        friction: physicsRef.current.friction,
        restitution: physicsRef.current.restitution,
        linearDamping: physicsRef.current.linearDamping,
        angularDamping: physicsRef.current.angularDamping,
        offscreen: false,
      });

      diceBoxRef.current = box;

      await box.init();

      window.__DICEBOX_AMMO_INIT__ = true;

      updateCanvasSize();
      setIsLoading(false);

      box.onRollComplete = (rollResults: any[]) => {
        setIsRandomizing(false);
        const total = rollResults.reduce((acc: number, r: { value: number }) => acc + r.value, 0);
        setDisplayTotal(total);

        if (rollPhaseRef.current === 'attack') {
          rollPhaseRef.current = 'normal';
          setAttackHitPrompt({ action: pendingActionRef.current!, value: total });
        } else {
          if (!isDamageRollRef.current) {
            const damageTypes = currentDamageTypesRef.current;
            currentDamageTypesRef.current = [];
            setResults(
              damageTypes.length > 0
                ? rollResults.map((r: any, i: number) => ({ ...r, damageType: damageTypes[i] ?? '' }))
                : rollResults
            );
            const statKey = currentStatModifierRef.current;
            currentStatModifierRef.current = null;
            if (statKey) {
              const stat = statsRef.current[statKey];
              if (stat) setActiveStatModifier({ stat: statKey, value: stat.modifier });
            } else {
              setActiveStatModifier(null);
            }
          }
        }
      };

      if (containerRef.current) {
        observerRef.current = new ResizeObserver(updateCanvasSize);
        observerRef.current.observe(containerRef.current);
      }
      window.addEventListener('resize', updateCanvasSize);
    } catch (err) {
      console.error('Failed to initialize dice box:', err);
      setIsLoading(false);
    }
  }, [updateCanvasSize]);

  const containerCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;

      if (node && !diceBoxRef.current) {
        initializeDiceBox();
      }
    },
    [initializeDiceBox]
  );

  useEffect(() => {
    if (!diceBoxRef.current || isLoading) return;
    diceBoxRef.current.updateConfig({
      theme: visualConfig.theme,
      themeColor: visualConfig.themeColor,
    });
  }, [visualConfig.theme, visualConfig.themeColor, isLoading]);

  useEffect(() => {
    return () => {
      if (diceBoxRef.current) {
        diceBoxRef.current = null;
      }
      window.__DICEBOX_AMMO_INIT__ = false;

      if (observerRef.current) {
        try {
          observerRef.current.disconnect();
        } catch (e) {
          // ignore
        }
        observerRef.current = null;
      }

      try {
        window.removeEventListener('resize', updateCanvasSize);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const rollD20 = useCallback(async () => {
    if (!diceBoxRef.current) return;

    setLastAction(null);
    setResults([]);
    setIsRandomizing(true);
    setIsDamageRoll(false);
    setActiveStatModifier(null);
    currentStatModifierRef.current = null;

    try {
      const r = await diceBoxRef.current.roll(['1d20']);
      if (r && r[0]) {
        setResults([{ qty: 1, value: r[0].value, rolls: [{ dieType: 'd20' }] }]);
        setDisplayTotal(r[0].value);
      }
    } catch (e) {
      console.error('Error during d20 roll:', e);
      setIsRandomizing(false);
    }
  }, []);

  const rollAction = useCallback(async (action: Action) => {
    if (!diceBoxRef.current) return;

    setLastAction(action);
    setShowActions(false);
    setResults([]);
    setIsRandomizing(true);
    setIsDamageRoll(false);
    setActiveStatModifier(null);
    currentStatModifierRef.current = action.statModifier ?? null;

    if (action.requiresD20) {
      pendingActionRef.current = action;
      rollPhaseRef.current = 'attack';
      try {
        await diceBoxRef.current.roll(['1d20']);
      } catch (e) {
        console.error('Error during attack roll:', e);
        setIsRandomizing(false);
        rollPhaseRef.current = 'normal';
        pendingActionRef.current = null;
      }
    } else {
      const notations = action.damageDice.map((die) => `${die.quantity}${die.dieType}`);
      if (notations.length === 0) { setIsRandomizing(false); return; }
      currentDamageTypesRef.current = action.damageDice.map((die) => die.damageType ?? '');
      try {
        await diceBoxRef.current.roll(notations);
      } catch (e) {
        console.error('Error during action roll:', e);
        setIsRandomizing(false);
      }
    }
  }, []);

  const reroll = useCallback(async () => {
    if (!diceBoxRef.current) return;

    if (lastAction) {
      rollAction(lastAction);
      return;
    }

    if (results.length === 0) return;

    const notations = results.map((r) => `${r.qty}${r.rolls[0]?.dieType ?? 'd6'}`);
    setResults([]);
    setIsRandomizing(true);

    try {
      await diceBoxRef.current.roll(notations);
    } catch (e) {
      console.error('Error during reroll:', e);
      setIsRandomizing(false);
    }
  }, [lastAction, results, rollAction]);

  const handleHitYes = useCallback(async () => {
    const action = attackHitPrompt?.action;
    setAttackHitPrompt(null);
    pendingActionRef.current = null;
    if (!action || !diceBoxRef.current) return;

    const notations = action.damageDice.map((die) => `${die.quantity}${die.dieType}`);
    if (notations.length === 0) return;

    currentDamageTypesRef.current = action.damageDice.map((die) => die.damageType ?? '');
    currentStatModifierRef.current = action.statModifier ?? null;
    setIsRandomizing(true);
    setIsDamageRoll(false);
    try {
      await diceBoxRef.current.roll(notations);
    } catch (e) {
      console.error('Error during damage roll:', e);
      setIsRandomizing(false);
    }
  }, [attackHitPrompt]);

  const handleHitNo = useCallback(() => {
    setAttackHitPrompt(null);
    pendingActionRef.current = null;
  }, []);

  const diceTotal = results.reduce((a, r) => a + r.value, 0);
  const grandTotal = diceTotal + (activeStatModifier?.value ?? 0);
  const modSuffix = activeStatModifier
    ? ` (${activeStatModifier.value >= 0 ? '+' : ''}${activeStatModifier.value})`
    : '';

  return (
    <div
      id="dicebox-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}
      onClick={(e) => { e.stopPropagation(); setShowResults(false); }}
    >
      {/* TOTAL - top left, position absolute */}
      <div className={`${styles.diffusedBackground} ${styles.totalBox}`}>
        <Button
          variant="subtle"
          disabled={results.length === 0}
          onClick={(e) => { e.stopPropagation(); setShowResults((v) => !v); }}
          className={styles.totalButton}
        >
          <Text size="xl" fw={700} className={styles.totalText}>
            {(isRandomizing || attackHitPrompt !== null) ? '???' : `${t('diceBox.total', { value: grandTotal })}${modSuffix}`}
          </Text>
        </Button>
      </div>

      {/* ACTIONS TOGGLE - right side, vertically centered, position absolute */}
      <div className={`${styles.diffusedBackground} ${styles.actionsToggle}`}>
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => setShowActions((v) => !v)}
        >
          {showActions ? <IconChevronRight size={24} /> : <IconChevronLeft size={24} />}
        </ActionIcon>
      </div>

      {/* RESULTS PANEL */}
      <Transition
        mounted={showResults}
        transition={{
          transitionProperty: 'opacity',
          in: { opacity: 1 },
          out: { opacity: 0 },
          common: { transition: 'opacity 300ms ease' },
        }}
      >
        {(style) => (
          <div className={styles.resultsContainer} style={style} onClick={(e) => e.stopPropagation()}>
            <SimpleGrid cols={3} spacing="md">
              {results.map((r, index) => {
                const typeStyle = r.damageType ? DAMAGE_TYPE_STYLES[r.damageType] : undefined;
                const individualValues = r.rolls
                  .map(roll => roll.value)
                  .filter((v): v is number => v !== undefined);
                return (
                  <div
                    key={index}
                    className={styles.resultCard}
                    style={{ ...typeStyle, position: 'relative' }}
                  >
                    {individualValues.length > 1 && (
                      <Tooltip
                        label={individualValues.join(' + ')}
                        withinPortal={false}
                        position="top"
                      >
                        <IconInfoCircle
                          size={14}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            opacity: 0.4,
                            cursor: 'default',
                          }}
                        />
                      </Tooltip>
                    )}
                    <Text fw={600} size="md">{r.qty + (r.rolls[0]?.dieType ?? '')}</Text>
                    <Text size="xl" fw={700}>{r.value}</Text>
                    {r.damageType && (
                      <Text size="xs" c="dimmed" style={{ textTransform: 'capitalize' }}>
                        {r.damageType}
                      </Text>
                    )}
                  </div>
                );
              })}
              {activeStatModifier && (
                <div
                  className={styles.resultCard}
                  style={STAT_STYLES[activeStatModifier.stat]}
                >
                  <Text fw={600} size="md">{t('diceBox.modifierLabel')}</Text>
                  <Text size="xl" fw={700}>
                    {activeStatModifier.value >= 0 ? '+' : ''}{activeStatModifier.value}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ textTransform: 'capitalize' }}>
                    {t(`statNames.${activeStatModifier.stat}`)}
                  </Text>
                </div>
              )}
            </SimpleGrid>
          </div>
        )}
      </Transition>

      {/* HIT CONFIRMATION PROMPT */}
      <Transition
        mounted={attackHitPrompt !== null}
        transition={{
          transitionProperty: 'opacity',
          in: { opacity: 1 },
          out: { opacity: 0 },
          common: { transition: 'opacity 200ms ease' },
        }}
      >
        {(transStyle) => (
          <Paper className={styles.hitConfirmation} style={transStyle} p="xl" shadow="xl" withBorder>
            <Stack align="center" gap="md">
              <Text size="lg" fw={600}>{t('diceBox.doesHit', { value: attackHitPrompt?.value })}</Text>
              <Group>
                <Button color="green" onClick={handleHitYes}>{t('diceBox.yes')}</Button>
                <Button color="red" variant="light" onClick={handleHitNo}>{t('diceBox.no')}</Button>
              </Group>
            </Stack>
          </Paper>
        )}
      </Transition>

      {/* MAIN 3D DICE AREA */}
      <div className={styles.mainContainer} style={{ backgroundColor: 'transparent' }}>
        <div
          id={containerId.current}
          ref={containerCallbackRef}
          className={styles.diceContainer}
        />

        {isLoading && (
          <Center className={styles.loader}>
            <Loader size="xl" />
          </Center>
        )}
      </div>

      {/* ACTIONS DRAWER */}
      <Drawer
        opened={showActions}
        onClose={() => setShowActions(false)}
        position="right"
        title={t('diceBox.actionsDrawerTitle')}
        withinPortal={false}
        offset={16}
        radius="md"
        size={500}
        styles={{ content: { height: 'auto' } }}
      >
        <Stack gap="sm" p="md">
          {actions.length === 0 && (
            <Text c="dimmed" size="sm" ta="center">{t('diceBox.noActionsConfigured')}</Text>
          )}
          {actions.map((action: Action) => {
            const primaryDamageType = action.damageDice.find(d => d.damageType)?.damageType;
            const cardStyle = primaryDamageType ? DAMAGE_TYPE_STYLES[primaryDamageType] : undefined;
            return (
              <UnstyledButton
                key={action.id}
                className={styles.actionCard}
                onClick={() => rollAction(action)}
                style={cardStyle}
              >
                <Group justify="space-between" mb={6}>
                  <Text style={{ paddingLeft: 12, paddingTop: 4 }} size="md">{action.name || t('diceBox.unnamed')}</Text>
                  {action.requiresD20 && (
                    <Badge size="sm" variant="light" color="blue" style={{ marginRight: 8, marginTop: 4 }}>{t('diceBox.attackBadge')}</Badge>
                  )}
                </Group>
                <Group gap={6} style={{ paddingLeft: 12, paddingBottom: 8 }}>
                  {action.damageDice.map((die, i) => {
                    const dieColor = die.damageType ? DAMAGE_TYPE_STYLES[die.damageType]?.borderColor : undefined;
                    return (
                      <Badge
                        key={i}
                        size="sm"
                        variant="outline"
                        style={dieColor ? { borderColor: dieColor, color: dieColor } : undefined}
                      >
                        {die.quantity}{die.dieType}{die.damageType ? ` · ${die.damageType}` : ''}
                      </Badge>
                    );
                  })}
                </Group>
              </UnstyledButton>
            );
          })}
        </Stack>
      </Drawer>

      {/* FOOTER */}
      <div className={`${styles.diffusedBackground} ${styles.footer}`}>
        <Group justify="space-between" align="center">
          <ActionIcon variant="light" size={48} onClick={rollD20} color="blue">
            <D20Icon size={28} />
          </ActionIcon>

          <Button
            size="lg"
            onClick={reroll}
            disabled={lastAction === null && results.length === 0}
            className={styles.rerollButton}
          >
            {t('diceBox.reroll')}
          </Button>

          <ActionIcon variant="light" size={48} onClick={toggleShowDiceBox}>
            <IconSettings size={36} />
          </ActionIcon>
        </Group>
      </div>
    </div>
  );
};

export default DiceBoxComponent;
