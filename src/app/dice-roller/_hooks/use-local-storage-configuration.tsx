'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { Stats, Action, ActionSet, DiceBoxConfig, VisualConfig } from '../_types/types';
import { api } from '~/trpc/react';

const STORAGE_KEYS = {
  STATS: 'diceroller_stats',
  ACTION_SETS: 'diceroller_action_sets',
  SELECTED_ACTION_SET: 'diceroller_selected_action_set',
  PHYSICS: 'diceroller_physics_config',
  VISUAL: 'diceroller_visual_config',
  LEGACY_ACTIONS: 'diceroller_actions',
};

interface DefaultConfigs {
  defaultStats: Stats;
  defaultActionSets: ActionSet[];
  defaultPhysicsConfig: DiceBoxConfig;
  defaultVisualConfig: VisualConfig;
}

export interface LocalStorageConfigurationReturn {
  stats: Stats;
  actionSets: ActionSet[];
  selectedActionSetId: string | null;
  physicsConfig: DiceBoxConfig;
  visualConfig: VisualConfig;
  handleStatsUpdate: (newStats: Stats) => void;
  handleActionSetsUpdate: (newSets: ActionSet[]) => void;
  handleSelectedActionSetUpdate: (id: string | null) => void;
  handlePhysicsUpdate: (config: DiceBoxConfig) => void;
  handleVisualsUpdate: (config: VisualConfig) => void;
}

export const useLocalStorageConfiguration = (defaults: DefaultConfigs): LocalStorageConfigurationReturn => {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [stats, setStats] = useState<Stats>(defaults.defaultStats);
  const [actionSets, setActionSets] = useState<ActionSet[]>(defaults.defaultActionSets);
  const [selectedActionSetId, setSelectedActionSetId] = useState<string | null>(null);
  const [physicsConfig, setPhysicsConfig] = useState<DiceBoxConfig>(defaults.defaultPhysicsConfig);
  const [visualConfig, setVisualConfig] = useState<VisualConfig>(defaults.defaultVisualConfig);

  // DB sync
  const dbSynced = useRef(false);
  const dbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest refs for capturing current values when debounce fires
  const latestStats = useRef(stats);
  latestStats.current = stats;
  const latestActionSets = useRef(actionSets);
  latestActionSets.current = actionSets;
  const latestSelectedId = useRef(selectedActionSetId);
  latestSelectedId.current = selectedActionSetId;
  const latestPhysics = useRef(physicsConfig);
  latestPhysics.current = physicsConfig;
  const latestVisuals = useRef(visualConfig);
  latestVisuals.current = visualConfig;

  const { data: dbConfig } = api.dice.getConfig.useQuery(undefined, {
    enabled: isLoggedIn,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { mutate: saveDbConfig } = api.dice.saveConfig.useMutation();

  // Load from localStorage on mount
  useEffect(() => {
    const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try { return JSON.parse(stored) as T; } catch { return defaultValue; }
      }
      return defaultValue;
    };

    setStats(loadFromStorage(STORAGE_KEYS.STATS, defaults.defaultStats));
    setPhysicsConfig(loadFromStorage(STORAGE_KEYS.PHYSICS, defaults.defaultPhysicsConfig));
    const storedVisual = loadFromStorage(STORAGE_KEYS.VISUAL, defaults.defaultVisualConfig);
    setVisualConfig({ ...defaults.defaultVisualConfig, ...storedVisual });

    let sets: ActionSet[] = loadFromStorage<ActionSet[]>(STORAGE_KEYS.ACTION_SETS, []);
    if (sets.length === 0) {
      const legacyActions = loadFromStorage<Action[]>(STORAGE_KEYS.LEGACY_ACTIONS, []);
      if (legacyActions.length > 0) {
        sets = [{ id: Date.now().toString(), name: 'Default', actions: legacyActions }];
        localStorage.setItem(STORAGE_KEYS.ACTION_SETS, JSON.stringify(sets));
      }
    }
    setActionSets(sets);

    const savedId = localStorage.getItem(STORAGE_KEYS.SELECTED_ACTION_SET);
    const validId = savedId && sets.some(s => s.id === savedId) ? savedId : (sets[0]?.id ?? null);
    setSelectedActionSetId(validId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Override with DB values when they arrive (once, and only if user is logged in)
  useEffect(() => {
    if (!dbConfig || dbSynced.current) return;
    dbSynced.current = true;

    if (dbConfig.diceRollerStats) {
      try {
        const s = JSON.parse(dbConfig.diceRollerStats) as Stats;
        setStats(s);
        localStorage.setItem(STORAGE_KEYS.STATS, dbConfig.diceRollerStats);
      } catch { /* keep localStorage value */ }
    }
    if (dbConfig.diceRollerPhysics) {
      try {
        const p = JSON.parse(dbConfig.diceRollerPhysics) as DiceBoxConfig;
        setPhysicsConfig(p);
        localStorage.setItem(STORAGE_KEYS.PHYSICS, dbConfig.diceRollerPhysics);
      } catch { /* keep localStorage value */ }
    }
    if (dbConfig.diceRollerVisuals) {
      try {
        const v = JSON.parse(dbConfig.diceRollerVisuals) as VisualConfig;
        setVisualConfig({ ...defaults.defaultVisualConfig, ...v });
        localStorage.setItem(STORAGE_KEYS.VISUAL, dbConfig.diceRollerVisuals);
      } catch { /* keep localStorage value */ }
    }
    if (dbConfig.diceRollerActionSets) {
      try {
        const sets = JSON.parse(dbConfig.diceRollerActionSets) as ActionSet[];
        setActionSets(sets);
        localStorage.setItem(STORAGE_KEYS.ACTION_SETS, dbConfig.diceRollerActionSets);
        const savedId = dbConfig.diceRollerSelectedActionSet;
        const validId = savedId && sets.some(s => s.id === savedId) ? savedId : (sets[0]?.id ?? null);
        setSelectedActionSetId(validId);
        if (validId) localStorage.setItem(STORAGE_KEYS.SELECTED_ACTION_SET, validId);
      } catch { /* keep localStorage value */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbConfig]);

  const scheduleDbSave = () => {
    if (!isLoggedIn) return;
    if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current);
    dbSaveTimer.current = setTimeout(() => {
      saveDbConfig({
        stats: JSON.stringify(latestStats.current),
        actionSets: JSON.stringify(latestActionSets.current),
        selectedActionSet: latestSelectedId.current,
        physics: JSON.stringify(latestPhysics.current),
        visuals: JSON.stringify(latestVisuals.current),
      });
      dbSaveTimer.current = null;
    }, 1500);
  };

  const saveToStorage = <T,>(key: string, value: T) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  };

  const handleStatsUpdate = (newStats: Stats) => {
    setStats(newStats);
    saveToStorage(STORAGE_KEYS.STATS, newStats);
    scheduleDbSave();
  };

  const handleActionSetsUpdate = (newSets: ActionSet[]) => {
    setActionSets(newSets);
    saveToStorage(STORAGE_KEYS.ACTION_SETS, newSets);
    setSelectedActionSetId(prev => {
      if (newSets.some(s => s.id === prev)) return prev;
      const fallback = newSets[0]?.id ?? null;
      if (fallback !== null) localStorage.setItem(STORAGE_KEYS.SELECTED_ACTION_SET, fallback);
      else localStorage.removeItem(STORAGE_KEYS.SELECTED_ACTION_SET);
      return fallback;
    });
    scheduleDbSave();
  };

  const handleSelectedActionSetUpdate = (id: string | null) => {
    setSelectedActionSetId(id);
    if (id !== null) localStorage.setItem(STORAGE_KEYS.SELECTED_ACTION_SET, id);
    else localStorage.removeItem(STORAGE_KEYS.SELECTED_ACTION_SET);
    scheduleDbSave();
  };

  const handlePhysicsUpdate = (config: DiceBoxConfig) => {
    setPhysicsConfig(config);
    saveToStorage(STORAGE_KEYS.PHYSICS, config);
    scheduleDbSave();
  };

  const handleVisualsUpdate = (config: VisualConfig) => {
    setVisualConfig(config);
    saveToStorage(STORAGE_KEYS.VISUAL, config);
    scheduleDbSave();
  };

  return {
    stats, actionSets, selectedActionSetId, physicsConfig, visualConfig,
    handleStatsUpdate, handleActionSetsUpdate, handleSelectedActionSetUpdate,
    handlePhysicsUpdate, handleVisualsUpdate,
  };
};
