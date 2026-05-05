'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { Stats, StatSet, Action, ActionSet, DiceBoxConfig, VisualConfig } from '../_types/types';
import { api } from '~/trpc/react';

const STORAGE_KEYS = {
  STAT_SETS: 'diceroller_stat_sets',
  SELECTED_STAT_SET: 'diceroller_selected_stat_set',
  ACTION_SETS: 'diceroller_action_sets',
  SELECTED_ACTION_SET: 'diceroller_selected_action_set',
  PHYSICS: 'diceroller_physics_v2',
  VISUAL: 'diceroller_visual_config',
  LEGACY_ACTIONS: 'diceroller_actions',
  LEGACY_STATS: 'diceroller_stats',
};

interface DefaultConfigs {
  defaultStatSets: StatSet[];
  defaultActionSets: ActionSet[];
  defaultPhysicsConfig: DiceBoxConfig;
  defaultVisualConfig: VisualConfig;
}

export interface LocalStorageConfigurationReturn {
  statSets: StatSet[];
  selectedStatSetId: string | null;
  actionSets: ActionSet[];
  selectedActionSetId: string | null;
  physicsConfig: DiceBoxConfig;
  visualConfig: VisualConfig;
  handleStatSetsUpdate: (newSets: StatSet[]) => void;
  handleSelectedStatSetUpdate: (id: string | null) => void;
  handleActionSetsUpdate: (newSets: ActionSet[]) => void;
  handleSelectedActionSetUpdate: (id: string | null) => void;
  handlePhysicsUpdate: (config: DiceBoxConfig) => void;
  handleVisualsUpdate: (config: VisualConfig) => void;
}

export const useLocalStorageConfiguration = (defaults: DefaultConfigs): LocalStorageConfigurationReturn => {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [statSets, setStatSets] = useState<StatSet[]>(defaults.defaultStatSets);
  const [selectedStatSetId, setSelectedStatSetId] = useState<string | null>(defaults.defaultStatSets[0]?.id ?? null);
  const [actionSets, setActionSets] = useState<ActionSet[]>(defaults.defaultActionSets);
  const [selectedActionSetId, setSelectedActionSetId] = useState<string | null>(null);
  const [physicsConfig, setPhysicsConfig] = useState<DiceBoxConfig>(defaults.defaultPhysicsConfig);
  const [visualConfig, setVisualConfig] = useState<VisualConfig>(defaults.defaultVisualConfig);

  // DB sync
  const dbSynced = useRef(false);
  const dbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest refs for capturing current values when debounce fires
  const latestStatSets = useRef(statSets);
  latestStatSets.current = statSets;
  const latestSelectedStatSetId = useRef(selectedStatSetId);
  latestSelectedStatSetId.current = selectedStatSetId;
  const latestActionSets = useRef(actionSets);
  latestActionSets.current = actionSets;
  const latestSelectedActionSetId = useRef(selectedActionSetId);
  latestSelectedActionSetId.current = selectedActionSetId;
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

    // Stat sets — try new format, fall back to legacy stats
    const storedStatSets = loadFromStorage<StatSet[] | null>(STORAGE_KEYS.STAT_SETS, null);
    if (storedStatSets && Array.isArray(storedStatSets) && storedStatSets.length > 0) {
      setStatSets(storedStatSets);
      const savedId = localStorage.getItem(STORAGE_KEYS.SELECTED_STAT_SET);
      const validId = savedId && storedStatSets.some(s => s.id === savedId) ? savedId : (storedStatSets[0]?.id ?? null);
      setSelectedStatSetId(validId);
    } else {
      // Migrate from legacy single-stats format
      const legacyStats = loadFromStorage<Stats | null>(STORAGE_KEYS.LEGACY_STATS, null);
      if (legacyStats && !Array.isArray(legacyStats) && 'strength' in legacyStats) {
        const migratedSet: StatSet = { id: 'default', name: 'Character', proficiencyBonus: 2, stats: legacyStats };
        setStatSets([migratedSet]);
        setSelectedStatSetId(migratedSet.id);
        localStorage.setItem(STORAGE_KEYS.STAT_SETS, JSON.stringify([migratedSet]));
        localStorage.setItem(STORAGE_KEYS.SELECTED_STAT_SET, migratedSet.id);
      } else {
        setStatSets(defaults.defaultStatSets);
        setSelectedStatSetId(defaults.defaultStatSets[0]?.id ?? null);
      }
    }

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

    const savedActionSetId = localStorage.getItem(STORAGE_KEYS.SELECTED_ACTION_SET);
    const validActionSetId = savedActionSetId && sets.some(s => s.id === savedActionSetId) ? savedActionSetId : (sets[0]?.id ?? null);
    setSelectedActionSetId(validActionSetId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Override with DB values when they arrive (once, and only if user is logged in)
  useEffect(() => {
    if (!dbConfig || dbSynced.current) return;
    dbSynced.current = true;

    if (dbConfig.diceRollerStats) {
      try {
        const parsed = JSON.parse(dbConfig.diceRollerStats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // New format: StatSet[]
          const sets = parsed as StatSet[];
          setStatSets(sets);
          localStorage.setItem(STORAGE_KEYS.STAT_SETS, dbConfig.diceRollerStats);
          const savedId = localStorage.getItem(STORAGE_KEYS.SELECTED_STAT_SET);
          const validId = savedId && sets.some(s => s.id === savedId) ? savedId : (sets[0]?.id ?? null);
          setSelectedStatSetId(validId);
          if (validId) localStorage.setItem(STORAGE_KEYS.SELECTED_STAT_SET, validId);
        } else if (!Array.isArray(parsed) && 'strength' in parsed) {
          // Legacy format: Stats object → migrate
          const legacyStats = parsed as Stats;
          const migratedSet: StatSet = { id: 'default', name: 'Character', proficiencyBonus: 2, stats: legacyStats };
          setStatSets([migratedSet]);
          setSelectedStatSetId(migratedSet.id);
          localStorage.setItem(STORAGE_KEYS.STAT_SETS, JSON.stringify([migratedSet]));
          localStorage.setItem(STORAGE_KEYS.SELECTED_STAT_SET, migratedSet.id);
        }
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
        stats: JSON.stringify(latestStatSets.current),
        actionSets: JSON.stringify(latestActionSets.current),
        selectedActionSet: latestSelectedActionSetId.current,
        physics: JSON.stringify(latestPhysics.current),
        visuals: JSON.stringify(latestVisuals.current),
      });
      dbSaveTimer.current = null;
    }, 1500);
  };

  const saveToStorage = <T,>(key: string, value: T) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  };

  const handleStatSetsUpdate = (newSets: StatSet[]) => {
    setStatSets(newSets);
    saveToStorage(STORAGE_KEYS.STAT_SETS, newSets);
    setSelectedStatSetId(prev => {
      if (newSets.some(s => s.id === prev)) return prev;
      const fallback = newSets[0]?.id ?? null;
      if (fallback !== null) localStorage.setItem(STORAGE_KEYS.SELECTED_STAT_SET, fallback);
      else localStorage.removeItem(STORAGE_KEYS.SELECTED_STAT_SET);
      return fallback;
    });
    scheduleDbSave();
  };

  const handleSelectedStatSetUpdate = (id: string | null) => {
    setSelectedStatSetId(id);
    if (id !== null) localStorage.setItem(STORAGE_KEYS.SELECTED_STAT_SET, id);
    else localStorage.removeItem(STORAGE_KEYS.SELECTED_STAT_SET);
    // No DB save needed — selection is local preference only
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
    statSets, selectedStatSetId, actionSets, selectedActionSetId, physicsConfig, visualConfig,
    handleStatSetsUpdate, handleSelectedStatSetUpdate, handleActionSetsUpdate,
    handleSelectedActionSetUpdate, handlePhysicsUpdate, handleVisualsUpdate,
  };
};
