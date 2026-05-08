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
  IconBackspace,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconSettings,
  IconSword,
  IconWand,
  IconX,
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
  acid: { backgroundColor: 'rgba(139, 195, 74, 0.2)', borderColor: '#8bc34a' },
  bludgeoning: { backgroundColor: 'rgba(121, 85, 72, 0.2)', borderColor: '#795548' },
  cold: { backgroundColor: 'rgba(79, 195, 247, 0.2)', borderColor: '#4fc3f7' },
  fire: { backgroundColor: 'rgba(255, 87, 34, 0.2)', borderColor: '#ff5722' },
  force: { backgroundColor: 'rgba(224, 64, 251, 0.2)', borderColor: '#e040fb' },
  lightning: { backgroundColor: 'rgba(255, 214, 0, 0.2)', borderColor: '#ffd600' },
  necrotic: { backgroundColor: 'rgba(55, 71, 79, 0.3)', borderColor: '#546e7a' },
  piercing: { backgroundColor: 'rgba(120, 144, 156, 0.2)', borderColor: '#78909c' },
  poison: { backgroundColor: 'rgba(123, 31, 162, 0.2)', borderColor: '#7b1fa2' },
  psychic: { backgroundColor: 'rgba(240, 98, 146, 0.2)', borderColor: '#f06292' },
  radiant: { backgroundColor: 'rgba(255, 235, 59, 0.2)', borderColor: '#ffeb3b' },
  slashing: { backgroundColor: 'rgba(239, 83, 80, 0.2)', borderColor: '#ef5350' },
  thunder: { backgroundColor: 'rgba(126, 87, 194, 0.2)', borderColor: '#7e57c2' },
};
const STAT_STYLES: Record<string, { backgroundColor: string; borderColor: string }> = {
  strength: { backgroundColor: 'rgba(244, 67, 54, 0.2)', borderColor: '#f44336' },
  dexterity: { backgroundColor: 'rgba(76, 175, 80, 0.2)', borderColor: '#4caf50' },
  constitution: { backgroundColor: 'rgba(255, 152, 0, 0.2)', borderColor: '#ff9800' },
  intelligence: { backgroundColor: 'rgba(33, 150, 243, 0.2)', borderColor: '#2196f3' },
  wisdom: { backgroundColor: 'rgba(0, 188, 212, 0.2)', borderColor: '#00bcd4' },
  charisma: { backgroundColor: 'rgba(156, 39, 176, 0.2)', borderColor: '#9c27b0' },
};

if (typeof window !== 'undefined' && !window.__DICEBOX_AMMO_INIT__) {
  window.__DICEBOX_AMMO_INIT__ = false;
}

export interface DiceBoxProps {
  configuration: LocalStorageConfigurationReturn;
  toggleShowDiceBox: () => void;
  isActive?: boolean;
}

const DiceBoxComponent: React.FC<DiceBoxProps> = ({
  configuration,
  toggleShowDiceBox,
  isActive = true,
}) => {
  console.log('[DiceBox] render | isActive:', isActive, '| configuration:', configuration);
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
  const [isDamageRoll, setIsDamageRollState] = useState(false);
  const [activeStatModifier, setActiveStatModifier] = useState<{ stat?: keyof Stats; value: number } | null>(null);

  const isDamageRollRef = useRef<boolean>(isDamageRoll);
  const diceBoxRef = useRef<InstanceType<typeof DiceBox> | null>(null);
  console.log('[DiceBox] diceBoxRef initialized:', !!diceBoxRef.current, diceBoxRef.current, diceBoxRef);
  const diceBoxReadyRef = useRef(false);
  const initializingRef = useRef(false);
  const initAttemptRef = useRef(0);
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
  const quickCalcModifierRef = useRef<{ value: number; stat?: keyof Stats } | null>(null);

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
    console.log('[DiceBox] initializeDiceBox called | containerRef:', !!containerRef.current, '| AMMO_INIT:', window.__DICEBOX_AMMO_INIT__, '| diceBoxRef:', !!diceBoxRef.current);
    if (!containerRef.current) { console.log('[DiceBox] init aborted: no container'); return; }

    if (window.__DICEBOX_AMMO_INIT__ && diceBoxRef.current) {
      console.log('[DiceBox] init skipped: already initialized');
      return;
    }

    if (diceBoxRef.current) { console.log('[DiceBox] init skipped: diceBoxRef already set'); return; }
    if (initializingRef.current) { console.log('[DiceBox] init skipped: already initializing'); return; }

    try {
      initializingRef.current = true;
      const attemptId = ++initAttemptRef.current;
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

      const initTimeout = setTimeout(() => {
        if (initAttemptRef.current !== attemptId || diceBoxReadyRef.current) return;
        console.warn('[DiceBox] init timed out; falling back to local random rolls');
        initAttemptRef.current += 1;
        initializingRef.current = false;
        diceBoxRef.current = null;
        setIsLoading(false);
      }, 6000);

      await box.init();
      clearTimeout(initTimeout);
      if (initAttemptRef.current !== attemptId) return;

      diceBoxRef.current = box;
      diceBoxReadyRef.current = true;
      initializingRef.current = false;

      window.__DICEBOX_AMMO_INIT__ = true;

      updateCanvasSize();
      setIsLoading(false);

      box.onRollComplete = (rollResults: any[]) => {
        console.log('[DiceBox] onRollComplete fired | phase:', rollPhaseRef.current, '| isD20:', isD20RollRef.current, '| results:', JSON.stringify(rollResults));
        setIsRandomizing(false);
        const allValues: number[] = rollResults.map((r: { value: number }) => r.value);

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
          setAttackHitPrompt({ action: pendingActionRef.current!, value: attackValue });

        } else if (isD20RollRef.current) {
          isD20RollRef.current = false;
          const chosen = pickByMode(individualDieValues);
          setResults([{ qty: 1, value: chosen, rolls: [{ dieType: 'd20', value: chosen }] }]);

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
              const statsObj = activeStatSetRef.current?.stats;
              const stat = statsObj ? statsObj[statKey] : undefined;
              if (stat) setActiveStatModifier({ stat: statKey as keyof Stats, value: stat.modifier });
            } else if (quickCalcModifierRef.current !== null) {
              const mod = quickCalcModifierRef.current;
              quickCalcModifierRef.current = null;
              setActiveStatModifier(mod);
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
      console.error('[DiceBox] Failed to initialize dice box:', err);
      initializingRef.current = false;
      diceBoxReadyRef.current = false;
      diceBoxRef.current = null;
      setIsLoading(false);
    }
  }, [updateCanvasSize]);

  const containerCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      console.log('[DiceBox] containerCallbackRef fired, node:', node ? 'attached' : 'detached', '| diceBoxRef:', diceBoxRef.current ? 'exists' : 'null');
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
      diceBoxReadyRef.current = false;
      initializingRef.current = false;
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

  const randomDie = useCallback((sides: number) => Math.floor(Math.random() * sides) + 1, []);

  const pickD20ByMode = useCallback((values: number[]) => {
    if (values.length === 0) return 0;
    if (rollModeRef.current === 'advantage') return Math.max(...values);
    if (rollModeRef.current === 'disadvantage') return Math.min(...values);
    return values[0]!;
  }, []);

  const rollFallbackNotations = useCallback((notations: string[]): DiceResult[] => {
    return notations.flatMap((notation) => {
      const match = notation.match(/^(\d+)d(\d+)$/i);
      if (!match) return [];
      const qty = Number(match[1]);
      const sides = Number(match[2]);
      const rolls = Array.from({ length: qty }, () => ({
        dieType: `d${sides}`,
        value: randomDie(sides),
      }));
      return [{
        qty,
        value: rolls.reduce((sum, roll) => sum + (roll.value ?? 0), 0),
        rolls,
      }];
    });
  }, [randomDie]);

  const rollD20 = useCallback(async () => {
    console.log('[DiceBox] rollD20 called | diceBoxRef:', !!diceBoxRef.current, '| ready:', diceBoxReadyRef.current);

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
    if (!diceBoxRef.current || !diceBoxReadyRef.current) {
      const values = Array.from({ length: rollModeRef.current !== 'normal' ? 2 : 1 }, () => randomDie(20));
      const chosen = pickD20ByMode(values);
      setResults([{ qty: 1, value: chosen, rolls: values.map((value) => ({ dieType: 'd20', value })) }]);
      setIsRandomizing(false);
      isD20RollRef.current = false;
      return;
    }

    console.log('[DiceBox] rolling d20 with notation:', notation, '| mode:', rollModeRef.current);
    const hangTimeout = setTimeout(() => console.error('[DiceBox] roll() has been pending for 8s — physics never settled'), 8000);
    try {
      await diceBoxRef.current.roll(notation);
      clearTimeout(hangTimeout);
      console.log('[DiceBox] roll() promise resolved for d20');
    } catch (e) {
      clearTimeout(hangTimeout);
      console.error('[DiceBox] Error during d20 roll:', e);
      setIsRandomizing(false);
      isD20RollRef.current = false;
    }
  }, []);

  const rollAction = useCallback(async (action: Action) => {
    console.log('[DiceBox] rollAction called | action:', action.name, '| requiresD20:', action.requiresD20, '| diceBoxRef:', !!diceBoxRef.current, '| ready:', diceBoxReadyRef.current);

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
      if (!diceBoxRef.current || !diceBoxReadyRef.current) {
        const values = Array.from({ length: rollModeRef.current !== 'normal' ? 2 : 1 }, () => randomDie(20));
        const chosen = pickD20ByMode(values);
        attackRollValuesRef.current = values;
        isCritRef.current = chosen === 20;
        setAttackHitPrompt({ action, value: chosen });
        setIsRandomizing(false);
        return;
      }
      console.log('[DiceBox] rolling attack d20 with notation:', attackNotation);
      try {
        await diceBoxRef.current.roll(attackNotation);
        console.log('[DiceBox] roll() promise resolved for attack');
      } catch (e) {
        console.error('[DiceBox] Error during attack roll:', e);
        setIsRandomizing(false);
        rollPhaseRef.current = 'normal';
        pendingActionRef.current = null;
      }
    } else {
      const notations = action.damageDice.map((die) => `${die.quantity}${die.dieType}`);
      if (notations.length === 0) { console.warn('[DiceBox] rollAction aborted: no dice in action'); setIsRandomizing(false); return; }
      currentDamageTypesRef.current = action.damageDice.map((die) => die.damageType ?? '');
      if (!diceBoxRef.current || !diceBoxReadyRef.current) {
        const fallbackResults = rollFallbackNotations(notations).map((result, index) => ({
          ...result,
          damageType: currentDamageTypesRef.current[index] ?? '',
        }));
        currentDamageTypesRef.current = [];
        setResults(fallbackResults);
        const statKey = currentStatModifierRef.current;
        currentStatModifierRef.current = null;
        if (statKey) {
          const stat = activeStatSetRef.current?.stats[statKey];
          if (stat) setActiveStatModifier({ stat: statKey, value: stat.modifier });
        }
        setIsRandomizing(false);
        return;
      }
      console.log('[DiceBox] rolling action dice:', notations);
      try {
        await diceBoxRef.current.roll(notations);
        console.log('[DiceBox] roll() promise resolved for action');
      } catch (e) {
        console.error('[DiceBox] Error during action roll:', e);
        setIsRandomizing(false);
      }
    }
  }, []);

  const reroll = useCallback(async () => {
    console.log('[DiceBox] reroll called | diceBoxRef:', !!diceBoxRef.current, '| lastAction:', lastAction?.name ?? null, '| results.length:', results.length);

    setAttackHitPrompt(null);
    pendingActionRef.current = null;
    isCritRef.current = false;

    if (lastAction) {
      rollAction(lastAction);
      return;
    }

    if (results.length === 0) return;

    const notations = results.map((r) => `${r.qty}${r.rolls[0]?.dieType ?? 'd6'}`);
    console.log('[DiceBox] rerolling with notations:', notations);
    setResults([]);
    setIsRandomizing(true);

    if (!diceBoxRef.current || !diceBoxReadyRef.current) {
      setResults(rollFallbackNotations(notations));
      setIsRandomizing(false);
      return;
    }

    try {
      await diceBoxRef.current.roll(notations);
      console.log('[DiceBox] roll() promise resolved for reroll');
    } catch (e) {
      console.error('[DiceBox] Error during reroll:', e);
      setIsRandomizing(false);
    }
  }, [lastAction, results, rollAction, rollFallbackNotations]);

  const handleHitYes = useCallback(async () => {
    const action = attackHitPrompt?.action;
    setAttackHitPrompt(null);
    pendingActionRef.current = null;
    if (!action) return;

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
    if (!diceBoxRef.current || !diceBoxReadyRef.current) {
      const fallbackResults = rollFallbackNotations(notations).map((result, index) => ({
        ...result,
        damageType: currentDamageTypesRef.current[index] ?? '',
      }));
      currentDamageTypesRef.current = [];
      setResults(fallbackResults);
      const statKey = currentStatModifierRef.current;
      currentStatModifierRef.current = null;
      if (statKey) {
        const stat = activeStatSetRef.current?.stats[statKey];
        if (stat) setActiveStatModifier({ stat: statKey, value: stat.modifier });
      }
      setIsRandomizing(false);
      return;
    }
    console.log('[DiceBox] rolling damage dice after hit:', notations);
    try {
      await diceBoxRef.current.roll(notations);
      console.log('[DiceBox] roll() promise resolved for damage');
    } catch (e) {
      console.error('[DiceBox] Error during damage roll:', e);
      setIsRandomizing(false);
    }
  }, [attackHitPrompt, rollFallbackNotations]);

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

  // ─── Quick Dice Calculator ─────────────────────────────────────────────────

  const QUICK_DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const;
  type QuickDieType = typeof QUICK_DIE_TYPES[number];

  type QuickCalcToken =
    | { type: 'dice'; quantity: number; die: QuickDieType }
    | { type: 'modifier'; value: number; stat?: keyof Stats };

  const [showQuickDice, setShowQuickDice] = useState(false);
  const [quickCalcTokens, setQuickCalcTokens] = useState<QuickCalcToken[]>([]);
  const [quickCalcPending, setQuickCalcPending] = useState('');
  const quickCalcTokensRef = useRef(quickCalcTokens);
  quickCalcTokensRef.current = quickCalcTokens;
  const quickCalcPendingRef = useRef(quickCalcPending);
  quickCalcPendingRef.current = quickCalcPending;
  const [quickCalcHistory, setQuickCalcHistory] = useState<QuickCalcToken[][]>([]);
  const quickCalcHistoryRef = useRef(quickCalcHistory);
  quickCalcHistoryRef.current = quickCalcHistory;

  const calcAddDigit = useCallback((d: string) => {
    setQuickCalcPending(p => {
      const next = p + d;
      return parseInt(next, 10) > 99 ? p : next;
    });
  }, []);

  const calcAddDie = useCallback((die: QuickDieType) => {
    const qty = parseInt(quickCalcPendingRef.current, 10) || 1;
    setQuickCalcHistory(prev => [...prev, quickCalcTokensRef.current]);
    setQuickCalcTokens(prev => {
      const idx = prev.findIndex(t => t.type === 'dice' && t.die === die);
      if (idx !== -1) {
        return prev.map((t, i) =>
          i === idx && t.type === 'dice' ? { ...t, quantity: t.quantity + qty } : t
        );
      }
      return [...prev, { type: 'dice', quantity: qty, die }];
    });
    setQuickCalcPending('');
  }, []);

  const calcAddStat = useCallback((statKey: keyof Stats) => {
    const stats = activeStatSetRef.current?.stats;
    if (!stats) return;
    setQuickCalcHistory(prev => [...prev, quickCalcTokensRef.current]);
    setQuickCalcTokens(prev => [...prev, { type: 'modifier', value: stats[statKey].modifier, stat: statKey }]);
    setQuickCalcPending('');
  }, []);

  const calcUndo = useCallback(() => {
    if (quickCalcPendingRef.current) {
      setQuickCalcPending('');
    } else if (quickCalcHistoryRef.current.length > 0) {
      const snapshot = quickCalcHistoryRef.current[quickCalcHistoryRef.current.length - 1]!;
      setQuickCalcHistory(prev => prev.slice(0, -1));
      setQuickCalcTokens(snapshot);
    }
  }, []);

  const calcClear = useCallback(() => {
    setQuickCalcTokens([]);
    setQuickCalcPending('');
    setQuickCalcHistory([]);
  }, []);

  const rollCalcExpression = useCallback(async () => {
    const tokens = quickCalcTokensRef.current;
    const diceTokens = tokens.filter((t): t is { type: 'dice'; quantity: number; die: QuickDieType } => t.type === 'dice');
    const modTokens = tokens.filter((t): t is { type: 'modifier'; value: number; stat?: keyof Stats } => t.type === 'modifier');
    if (diceTokens.length === 0) return;

    const grouped: Partial<Record<QuickDieType, number>> = {};
    for (const t of diceTokens) grouped[t.die] = (grouped[t.die] ?? 0) + t.quantity;
    const notations = QUICK_DIE_TYPES
      .filter(die => (grouped[die] ?? 0) > 0)
      .map(die => `${grouped[die]}${die}`);

    const totalMod = modTokens.reduce((s, t) => s + t.value, 0);
    const singleStat = modTokens.length === 1 ? modTokens[0]?.stat : undefined;

    setLastAction(null);
    setAttackHitPrompt(null);
    setResults([]);
    setIsRandomizing(true);
    setIsDamageRoll(false);
    setActiveStatModifier(null);
    setCritBonus(null);
    isCritRef.current = false;
    isD20RollRef.current = false;
    rollPhaseRef.current = 'normal';
    currentDamageTypesRef.current = [];
    currentStatModifierRef.current = null;
    quickCalcModifierRef.current = totalMod !== 0 ? { value: totalMod, stat: singleStat } : null;

    if (!diceBoxRef.current || !diceBoxReadyRef.current) {
      setResults(rollFallbackNotations(notations));
      if (quickCalcModifierRef.current !== null) {
        const mod = quickCalcModifierRef.current;
        quickCalcModifierRef.current = null;
        setActiveStatModifier(mod);
      }
      setIsRandomizing(false);
      return;
    }

    console.log('[DiceBox] rolling calc expression:', notations, '| totalMod:', totalMod);
    try {
      await diceBoxRef.current.roll(notations);
      console.log('[DiceBox] roll() promise resolved for calc expression');
    } catch (e) {
      console.error('[DiceBox] Error during calculator roll:', e);
      setIsRandomizing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollFallbackNotations]);

  const calcHasDice = quickCalcTokens.some(t => t.type === 'dice');
  const calcExpressionParts = quickCalcTokens.map(t =>
    t.type === 'dice' ? `${t.quantity}${t.die}` : `${t.value >= 0 ? '+' : ''}${t.value}`
  );
  const calcDisplayStr = [
    calcExpressionParts.join(' '),
    quickCalcPending,
  ].filter(Boolean).join(calcExpressionParts.length > 0 ? ' ' : '');

  // ───────────────────────────────────────────────────────────────────────────

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
      className={!isActive ? styles.inactive : undefined}
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
        {/* Backdrop: closes results when clicking outside the panel */}
        {showResults && (
          <div
            style={{ position: 'absolute', inset: 0 }}
            onClick={() => setShowResults(false)}
          />
        )}

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

        {/* QUICK DICE CALCULATOR - left side, vertically centered */}
        <div className={styles.quickDiceContainer}>
          <div className={`${styles.diffusedBackground} ${styles.quickDiceTogglePill}`}>
            <ActionIcon variant="subtle" size="lg" onClick={() => setShowQuickDice(v => !v)}>
              {showQuickDice ? <IconChevronLeft size={24} /> : <IconChevronRight size={24} />}
            </ActionIcon>
          </div>

          <Transition
            mounted={showQuickDice}
            transition={{
              transitionProperty: 'opacity, transform',
              in: { opacity: 1, transform: 'translateX(0)' },
              out: { opacity: 0, transform: 'translateX(-8px)' },
              common: { transition: 'opacity 180ms ease, transform 180ms ease' },
            }}
          >
            {(style) => (
              <div
                className={`${styles.diffusedBackground} ${styles.quickCalcPanel}`}
                style={style}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Expression display */}
                <div className={styles.quickCalcDisplay} style={{ position: 'relative', paddingRight: calcDisplayStr ? 22 : 8 }}>
                  <Text
                    size="xs"
                    ff="monospace"
                    ta="right"
                    c={calcDisplayStr ? undefined : 'dimmed'}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block' }}
                  >
                    {calcDisplayStr || '—'}
                  </Text>
                  {calcDisplayStr && (
                    <ActionIcon
                      variant="transparent"
                      size={16}
                      style={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)' }}
                      onClick={calcClear}
                    >
                      <IconX size={11} />
                    </ActionIcon>
                  )}
                </div>

                {/* Dice grid: d4–d20 in 3 cols, d100 full-width */}
                <div className={styles.quickCalcGrid}>
                  {(['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as QuickDieType[]).map(die => (
                    <UnstyledButton
                      key={die}
                      className={styles.quickCalcBtn}
                      onClick={() => calcAddDie(die)}
                    >
                      <Text size="xs" fw={700}>{die.toUpperCase()}</Text>
                    </UnstyledButton>
                  ))}
                  <UnstyledButton
                    className={styles.quickCalcBtn}
                    style={{ gridColumn: '1 / -1' }}
                    onClick={() => calcAddDie('d100')}
                  >
                    <Text size="xs" fw={700}>D100</Text>
                  </UnstyledButton>
                </div>

                {/* Stats grid (3 cols) — only shown when a stat set is active */}
                {activeStatSet && (
                  <div className={styles.quickCalcGrid}>
                    {(Object.keys(activeStatSet.stats) as Array<keyof Stats>).map(statKey => {
                      const mod = activeStatSet.stats[statKey].modifier;
                      return (
                        <UnstyledButton
                          key={statKey}
                          className={styles.quickCalcBtn}
                          style={STAT_STYLES[statKey]}
                          onClick={() => calcAddStat(statKey)}
                        >
                          <Text size="xs" fw={700}>{statKey.slice(0, 3).toUpperCase()}</Text>
                          <Text size="xs">{mod >= 0 ? '+' : ''}{mod}</Text>
                        </UnstyledButton>
                      );
                    })}
                  </div>
                )}

                {/* Number pad + undo + roll */}
                <div className={styles.quickCalcGrid}>
                  {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                    <UnstyledButton
                      key={n}
                      className={styles.quickCalcBtn}
                      onClick={() => calcAddDigit(String(n))}
                    >
                      <Text size="sm" fw={600}>{n}</Text>
                    </UnstyledButton>
                  ))}
                  <UnstyledButton
                    className={styles.quickCalcBtn}
                    style={{ opacity: (quickCalcTokens.length > 0 || quickCalcPending) ? 1 : 0.35 }}
                    onClick={calcUndo}
                  >
                    <IconBackspace size={15} />
                  </UnstyledButton>
                  <UnstyledButton
                    className={styles.quickCalcBtn}
                    onClick={() => calcAddDigit('0')}
                  >
                    <Text size="sm" fw={600}>0</Text>
                  </UnstyledButton>
                  <ActionIcon
                    variant="light"
                    color="blue"
                    style={{ width: '100%', height: 36, borderRadius: 6 }}
                    disabled={!calcHasDice || isRandomizing}
                    onClick={() => { void rollCalcExpression(); if (window.innerWidth <= 1024) setShowQuickDice(false); }}
                  >
                    <D20Icon size={18} />
                  </ActionIcon>
                </div>
              </div>
            )}
          </Transition>
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
                    style={activeStatModifier.stat ? STAT_STYLES[activeStatModifier.stat] : undefined}
                  >
                    <Text fw={600} size="md">{t('diceBox.modifierLabel')}</Text>
                    <Text size="xl" fw={700}>
                      {activeStatModifier.value >= 0 ? '+' : ''}{activeStatModifier.value}
                    </Text>
                    {activeStatModifier.stat && (
                      <Text size="xs" c="dimmed" style={{ textTransform: 'capitalize' }}>
                        {t(`statNames.${activeStatModifier.stat}`)}
                      </Text>
                    )}
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
