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
  Select,
  SegmentedControl,
} from '@mantine/core';
import DiceBox from '@3d-dice/dice-box';
import type { Action, ActionSet, DiceResult, DiceSelections, Stats, StatSet, RollType } from '../_types/types';
import {
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconSettings,
  IconSword,
  IconWand,
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
  lightning:   { backgroundColor: 'rgba(255, 214, 0, 0.2)',   borderColor: '#ffd600' },
  necrotic:    { backgroundColor: 'rgba(55, 71, 79, 0.3)',    borderColor: '#546e7a' },
  piercing:    { backgroundColor: 'rgba(120, 144, 156, 0.2)', borderColor: '#78909c' },
  poison:      { backgroundColor: 'rgba(123, 31, 162, 0.2)',  borderColor: '#7b1fa2' },
  psychic:     { backgroundColor: 'rgba(240, 98, 146, 0.2)',  borderColor: '#f06292' },
  radiant:     { backgroundColor: 'rgba(255, 235, 59, 0.2)',  borderColor: '#ffeb3b' },
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
  const { actionSets, selectedActionSetId, handleSelectedActionSetUpdate, physicsConfig, visualConfig, statSets, selectedStatSetId, handleSelectedStatSetUpdate } = configuration;

  const activeStatSet: StatSet | null = statSets.find(s => s.id === selectedStatSetId) ?? statSets[0] ?? null;

  const { t } = useTranslation();

  const statRollsId = '__stat-rolls__';
  const statRollActionSet: ActionSet | null = activeStatSet
    ? {
        id: statRollsId,
        name: t('diceBox.statRolls'),
        actions: (Object.keys(activeStatSet.stats) as Array<keyof Stats>).map((key) => ({
          id: `stat-roll-${key}`,
          name: t(`statNames.${key}`),
          requiresD20: false,
          damageDice: [{ quantity: 1, dieType: 'd20' as keyof DiceSelections }],
          statModifier: key,
        })),
      }
    : null;

  const allActionSets: ActionSet[] = statRollActionSet
    ? [statRollActionSet, ...actionSets]
    : actionSets;

  const activeActions: Action[] = (allActionSets.find(s => s.id === selectedActionSetId) ?? allActionSets[0])?.actions ?? [];

  const [rollModeKey, setRollModeKey] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRollModeKey((k) => k + 1));
    return () => cancelAnimationFrame(id);
  }, []);

  const [results, setResults] = useState<DiceResult[]>([]);
  const [showActions, setShowActions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [isDamageRoll, setIsDamageRollState] = useState(false);
  const [activeStatModifier, setActiveStatModifier] = useState<{ stat: keyof Stats; value: number } | null>(null);

  const isDamageRollRef = useRef<boolean>(isDamageRoll);
  const diceBoxRef = useRef<InstanceType<typeof DiceBox> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const updatingRef = useRef<boolean>(false);

  const [attackHitPrompt, setAttackHitPrompt] = useState<{ action: Action; value: number } | null>(null);
  const rollPhaseRef = useRef<'attack' | 'normal'>('normal');
  const pendingActionRef = useRef<Action | null>(null);
  const currentDamageTypesRef = useRef<string[]>([]);
  const currentStatModifierRef = useRef<keyof Stats | null>(null);

  const [lastAction, setLastAction] = useState<Action | null>(null);

  const [rollMode, setRollMode] = useState<RollType>('normal');
  const rollModeRef = useRef<RollType>('normal');
  rollModeRef.current = rollMode;

  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [critBonus, setCritBonus] = useState<number | null>(null);
  const isCritRef = useRef<boolean>(false);
  const isD20RollRef = useRef<boolean>(false);
  const attackRollValuesRef = useRef<number[]>([]);

  const physicsRef = useRef(configuration.physicsConfig);
  const visualRef = useRef(configuration.visualConfig);
  const activeStatSetRef = useRef(activeStatSet);
  physicsRef.current = physicsConfig;
  visualRef.current = visualConfig;
  activeStatSetRef.current = activeStatSet;

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
      const p = physicsRef.current;
      const box = new DiceBox({
        container: `#${containerId.current}`,
        assetPath: '/assets/dice-box/',
        theme: visualRef.current.theme,
        themeColor: visualRef.current.themeColor,
        scale: visualRef.current.scale ?? 6,
        gravity: p.gravity,
        mass: p.mass,
        friction: p.friction,
        restitution: p.restitution,
        linearDamping: p.linearDamping,
        angularDamping: p.angularDamping,
        ...({ spinForce: p.spinForce, throwForce: p.throwForce, startingHeight: p.startingHeight, settleTimeout: p.settleTimeout } as Record<string, number>),
        offscreen: false,
      });

      diceBoxRef.current = box;

      await box.init();

      window.__DICEBOX_AMMO_INIT__ = true;

      updateCanvasSize();
      setIsLoading(false);

      box.onRollComplete = (rollResults: any[]) => {
        setIsRandomizing(false);
        const allValues: number[] = rollResults.map((r: { value: number }) => r.value);
        const rawTotal = allValues.reduce((a, b) => a + b, 0);

        const pickByMode = (vals: number[]): number => {
          if (vals.length === 0) return 0;
          if (rollModeRef.current === 'advantage') return Math.max(...vals);
          if (rollModeRef.current === 'disadvantage') return Math.min(...vals);
          return vals[0]!;
        };

        const individualDieValues: number[] = rollResults.flatMap((r: any) =>
          r.rolls?.map((roll: any) => roll.value).filter((v: any) => typeof v === 'number') ?? [r.value]
        );

        if (rollPhaseRef.current === 'attack') {
          rollPhaseRef.current = 'normal';
          const attackValue = pickByMode(individualDieValues);
          attackRollValuesRef.current = individualDieValues;
          isCritRef.current = attackValue === 20;
          setDisplayTotal(attackValue);
          setAttackHitPrompt({ action: pendingActionRef.current!, value: attackValue });

        } else if (isD20RollRef.current) {
          isD20RollRef.current = false;
          const chosen = pickByMode(individualDieValues);
          setDisplayTotal(chosen);
          setResults([{ qty: 1, value: chosen, rolls: [{ dieType: 'd20', value: chosen }] }]);

        } else {
          setDisplayTotal(rawTotal);
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
              const statsObj = activeStatSetRef.current?.stats;
              const stat = statsObj ? statsObj[statKey] : undefined;
              if (stat) setActiveStatModifier({ stat: statKey as keyof Stats, value: stat.modifier });
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
        requestAnimationFrame(() => {
          if (containerRef.current) {
            void initializeDiceBox();
          }
        });
      }
    },
    [initializeDiceBox]
  );

  useEffect(() => {
    if (!diceBoxRef.current || isLoading) return;
    diceBoxRef.current.updateConfig({
      theme: visualConfig.theme,
      themeColor: visualConfig.themeColor,
      scale: visualConfig.scale ?? 6,
    });
  }, [visualConfig.theme, visualConfig.themeColor, visualConfig.scale, isLoading]);

  useEffect(() => {
    if (!diceBoxRef.current || isLoading) return;
    diceBoxRef.current.updateConfig({
      gravity: physicsConfig.gravity,
      mass: physicsConfig.mass,
      friction: physicsConfig.friction,
      restitution: physicsConfig.restitution,
      linearDamping: physicsConfig.linearDamping,
      angularDamping: physicsConfig.angularDamping,
      ...({ spinForce: physicsConfig.spinForce, throwForce: physicsConfig.throwForce, startingHeight: physicsConfig.startingHeight, settleTimeout: physicsConfig.settleTimeout } as Record<string, number>),
    });
  }, [physicsConfig, isLoading]);

  useEffect(() => {
    if (!selectedActionSetId) return;
    const set = actionSets.find(s => s.id === selectedActionSetId);
    if (set?.statSetId) {
      handleSelectedStatSetUpdate(set.statSetId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActionSetId]);

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
    setCritBonus(null);
    isCritRef.current = false;
    currentStatModifierRef.current = null;
    isD20RollRef.current = true;

    const notation = rollModeRef.current !== 'normal' ? ['2d20'] : ['1d20'];
    try {
      await diceBoxRef.current.roll(notation);
      // Result handled by onRollComplete via isD20RollRef
    } catch (e) {
      console.error('Error during d20 roll:', e);
      setIsRandomizing(false);
      isD20RollRef.current = false;
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
    setCritBonus(null);
    isCritRef.current = false;
    currentStatModifierRef.current = action.statModifier ?? null;

    if (action.requiresD20) {
      pendingActionRef.current = action;
      rollPhaseRef.current = 'attack';
      const attackNotation = rollModeRef.current !== 'normal' ? ['2d20'] : ['1d20'];
      try {
        await diceBoxRef.current.roll(attackNotation);
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

    setAttackHitPrompt(null);
    pendingActionRef.current = null;
    isCritRef.current = false;

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

    // Compute crit bonus: max face value × quantity for each damage die group
    if (isCritRef.current) {
      const dieSides: Record<string, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
      const bonus = action.damageDice.reduce((sum, die) => sum + die.quantity * (dieSides[die.dieType] ?? 0), 0);
      setCritBonus(bonus);
    }
    isCritRef.current = false;

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
    isCritRef.current = false;
    setCritBonus(null);
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const handleBackgroundPointerDown = useCallback(() => {
    holdTimerRef.current = setTimeout(() => setIsHolding(true), 300);
  }, []);

  const handlePointerRelease = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  }, []);

  const diceTotal = results.reduce((a, r) => a + r.value, 0);
  const grandTotal = diceTotal + (activeStatModifier?.value ?? 0) + (critBonus ?? 0);
  const modSuffix = activeStatModifier
    ? ` (${activeStatModifier.value >= 0 ? '+' : ''}${activeStatModifier.value})`
    : '';

  // Compute total attack value including stat modifier and proficiency bonus
  const attackStatMod = attackHitPrompt?.action.statModifier && activeStatSet
    ? activeStatSet.stats[attackHitPrompt.action.statModifier].modifier
    : 0;
  const attackProfBonus = (attackHitPrompt?.action.proficient && activeStatSet)
    ? activeStatSet.proficiencyBonus
    : 0;
  const attackDisplayTotal = (attackHitPrompt?.value ?? 0) + attackStatMod + attackProfBonus;
  const hasAttackModifiers = attackStatMod !== 0 || attackProfBonus !== 0;

  return (
    <div
      id="dicebox-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}
      onClick={(e) => { e.stopPropagation(); setShowResults(false); }}
      onPointerUp={handlePointerRelease}
      onPointerLeave={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
    >
      {/* MAIN 3D DICE AREA */}
      <div
        className={styles.mainContainer}
        style={{ backgroundColor: 'transparent' }}
        onPointerDown={handleBackgroundPointerDown}
        onContextMenu={(e) => e.preventDefault()}
      >
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

      {/* UI OVERLAY — fades on hold so dice are visible beneath */}
      <div className={`${styles.uiOverlay} ${isHolding ? styles.uiOverlayFaded : ''}`}>
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

        {/* ROLL MODE TOGGLE - top right, position absolute */}
        <div className={`${styles.diffusedBackground} ${styles.rollModeToggle}`}>
          <SegmentedControl
            key={rollModeKey}
            size="xs"
            value={rollMode}
            onChange={(v) => setRollMode(v as RollType)}
            color={rollMode === 'advantage' ? 'green' : rollMode === 'disadvantage' ? 'red' : undefined}
            data={[
              { value: 'disadvantage', label: t('diceBox.disadvantage') },
              { value: 'normal', label: t('diceBox.normal') },
              { value: 'advantage', label: t('diceBox.advantage') },
            ]}
          />
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
                {critBonus !== null && critBonus > 0 && (
                  <div
                    className={styles.resultCard}
                    style={{ backgroundColor: 'rgba(255, 214, 0, 0.25)', borderColor: '#ffd600' }}
                  >
                    <Text fw={700} size="md" style={{ color: '#b8860b' }}>⚔ {t('diceBox.criticalHit')}</Text>
                    <Text size="xl" fw={700}>+{critBonus}</Text>
                    <Text size="xs" c="dimmed">{t('diceBox.critBonusLabel')}</Text>
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
                <Text size="lg" fw={600}>{t('diceBox.doesHit', { value: attackDisplayTotal })}</Text>
                {(hasAttackModifiers || rollMode !== 'normal') && (
                  <Text size="xs" c="dimmed">
                    {rollMode !== 'normal' && attackRollValuesRef.current.length > 1
                      ? `[${attackRollValuesRef.current.join(', ')}] → ${attackHitPrompt?.value}`
                      : attackHitPrompt?.value
                    }
                    {attackStatMod !== 0 && ` ${attackStatMod >= 0 ? '+' : ''}${attackStatMod} ${attackHitPrompt?.action.statModifier ?? ''}`}
                    {attackProfBonus !== 0 && ` + PB +${attackProfBonus}`}
                  </Text>
                )}
                <Group>
                  <Button color="green" onClick={handleHitYes}>{t('diceBox.yes')}</Button>
                  <Button color="red" variant="light" onClick={handleHitNo}>{t('diceBox.no')}</Button>
                </Group>
              </Stack>
            </Paper>
          )}
        </Transition>

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
            {statSets.length > 0 && (
              <Select
                label={t('diceBox.statSetLabel')}
                data={statSets.map((s: StatSet) => ({ value: s.id, label: s.name || t('stats.unnamedStatSet') }))}
                value={selectedStatSetId ?? statSets[0]?.id ?? null}
                onChange={(id) => handleSelectedStatSetUpdate(id)}
                comboboxProps={{ withinPortal: false }}
              />
            )}
            {allActionSets.length > 0 && (
              <Select
                label={t('diceBox.actionSetLabel')}
                data={allActionSets.map((s: ActionSet) => ({ value: s.id, label: s.name || t('actions.unnamedActionSet') }))}
                value={selectedActionSetId ?? allActionSets[0]?.id ?? null}
                onChange={(id) => handleSelectedActionSetUpdate(id)}
                comboboxProps={{ withinPortal: false }}
              />
            )}
            {activeActions.length === 0 && (
              <Text c="dimmed" size="sm" ta="center">{t('diceBox.noActionsConfigured')}</Text>
            )}
            {activeActions.map((action: Action) => {
              const primaryDamageType = action.damageDice.find(d => d.damageType)?.damageType;
              const cardStyle = primaryDamageType ? DAMAGE_TYPE_STYLES[primaryDamageType] : undefined;
              return (
                <UnstyledButton
                  key={action.id}
                  className={styles.actionCard}
                  onClick={() => rollAction(action)}
                  style={{ ...cardStyle, position: 'relative' }}
                >
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    {action.requiresD20 ? <IconSword size={20} /> : <IconWand size={20} />}
                  </div>
                  <Group justify="space-between" mb={6}>
                    <Text style={{ paddingLeft: 12, paddingTop: 4 }} size="md">{action.name || t('diceBox.unnamed')}</Text>
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
    </div>
  );
};

export default DiceBoxComponent;
