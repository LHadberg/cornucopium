import type { ActionSet } from '../_types/types';

const defaultStats = {
  strength: { name: 'Strength', value: 10, modifier: 0 },
  dexterity: { name: 'Dexterity', value: 10, modifier: 0 },
  constitution: { name: 'Constitution', value: 10, modifier: 0 },
  intelligence: { name: 'Intelligence', value: 10, modifier: 0 },
  wisdom: { name: 'Wisdom', value: 10, modifier: 0 },
  charisma: { name: 'Charisma', value: 10, modifier: 0 },
};

const defaultActionSets: ActionSet[] = [];

const defaultPhysicsConfig = {
  gravity: 1,
  mass: 1,
  friction: 0.8,
  restitution: 0.5,
  linearDamping: 0.5,
  angularDamping: 0.5,
};

const defaultVisualConfig = {
  theme: 'default',
  themeColor: '#ffffff',
  diceColor: '#ffffff',
  textColor: '#000000',
  trayColor: '#1a1a1a',
  wallStyle: 'geometric',
  wallRepeat: 1,
  wallColor: '#8b7355',
  backgroundColor: '#2d4a2d',
  backgroundStyle: 'diamond',
  backgroundRepeat: 1,
};

export const defaultConfigs = {
  defaultStats,
  defaultActionSets,
  defaultPhysicsConfig,
  defaultVisualConfig,
};
