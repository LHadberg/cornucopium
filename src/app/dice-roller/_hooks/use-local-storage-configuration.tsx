'use client';

import { useState, useEffect } from 'react';
import type { Stats, Action, DiceBoxConfig, VisualConfig } from '../_types/types';

const STORAGE_KEYS = {
  STATS: 'diceroller_stats',
  ACTIONS: 'diceroller_actions',
  PHYSICS: 'diceroller_physics_config',
  VISUAL: 'diceroller_visual_config',
};

interface DefaultConfigs {
  defaultStats: Stats;
  defaultActions: Action[];
  defaultPhysicsConfig: DiceBoxConfig;
  defaultVisualConfig: VisualConfig;
}

export interface LocalStorageConfigurationReturn {
  stats: Stats;
  actions: Action[];
  physicsConfig: DiceBoxConfig;
  visualConfig: VisualConfig;
  handleStatsUpdate: (newStats: Stats) => void;
  handleActionsUpdate: (newActions: Action[]) => void;
  handlePhysicsUpdate: (config: DiceBoxConfig) => void;
  handleVisualsUpdate: (config: VisualConfig) => void;
}

export const useLocalStorageConfiguration = (defaults: DefaultConfigs): LocalStorageConfigurationReturn => {
  const [stats, setStats] = useState<Stats>(defaults.defaultStats);
  const [actions, setActions] = useState<Action[]>(defaults.defaultActions);
  const [physicsConfig, setPhysicsConfig] = useState<DiceBoxConfig>(defaults.defaultPhysicsConfig);
  const [visualConfig, setVisualConfig] = useState<VisualConfig>(defaults.defaultVisualConfig);

  useEffect(() => {
    const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error(`Error loading ${key} from localStorage:`, e);
          return defaultValue;
        }
      }
      return defaultValue;
    };

    setStats(loadFromStorage(STORAGE_KEYS.STATS, defaults.defaultStats));
    setActions(loadFromStorage(STORAGE_KEYS.ACTIONS, defaults.defaultActions));
    setPhysicsConfig(loadFromStorage(STORAGE_KEYS.PHYSICS, defaults.defaultPhysicsConfig));
    const storedVisual = loadFromStorage(STORAGE_KEYS.VISUAL, defaults.defaultVisualConfig);
    setVisualConfig({ ...defaults.defaultVisualConfig, ...storedVisual });
  }, [defaults]);

  const saveToStorage = <T,>(key: string, value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  };

  const handleStatsUpdate = (newStats: Stats) => {
    setStats(newStats);
    saveToStorage(STORAGE_KEYS.STATS, newStats);
  };

  const handleActionsUpdate = (newActions: Action[]) => {
    setActions(newActions);
    saveToStorage(STORAGE_KEYS.ACTIONS, newActions);
  };

  const handlePhysicsUpdate = (config: DiceBoxConfig) => {
    setPhysicsConfig(config);
    saveToStorage(STORAGE_KEYS.PHYSICS, config);
  };

  const handleVisualsUpdate = (config: VisualConfig) => {
    setVisualConfig(config);
    saveToStorage(STORAGE_KEYS.VISUAL, config);
  };

  return {
    stats,
    actions,
    physicsConfig,
    visualConfig,
    handleStatsUpdate,
    handleActionsUpdate,
    handlePhysicsUpdate,
    handleVisualsUpdate,
  };
};
