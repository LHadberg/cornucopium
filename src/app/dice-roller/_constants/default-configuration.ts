import type { ActionSet, DiceBoxConfig, StatSet } from '../_types/types';

const defaultStats = {
  strength: { name: 'Strength', value: 10, modifier: 0 },
  dexterity: { name: 'Dexterity', value: 10, modifier: 0 },
  constitution: { name: 'Constitution', value: 10, modifier: 0 },
  intelligence: { name: 'Intelligence', value: 10, modifier: 0 },
  wisdom: { name: 'Wisdom', value: 10, modifier: 0 },
  charisma: { name: 'Charisma', value: 10, modifier: 0 },
};

const defaultStatSets: StatSet[] = [
  {
    id: 'default',
    name: 'Character',
    proficiencyBonus: 2,
    stats: defaultStats,
  },
];

const defaultActionSets: ActionSet[] = [];

export const DICE_WEIGHT_PRESETS: Record<'light' | 'medium' | 'heavy', DiceBoxConfig> = {
  light:  { gravity: 0.5, mass: 0.5, friction: 0.3, restitution: 0.6, linearDamping: 0.3, angularDamping: 0.3, spinForce: 6,  throwForce: 3,   startingHeight: 12, settleTimeout: 4000 },
  medium: { gravity: 1,   mass: 1,   friction: 0.8, restitution: 0.5, linearDamping: 0.5, angularDamping: 0.5, spinForce: 4,  throwForce: 2,   startingHeight: 8,  settleTimeout: 5000 },
  heavy:  { gravity: 2,   mass: 2,   friction: 1.0, restitution: 0.3, linearDamping: 0.7, angularDamping: 0.7, spinForce: 2,  throwForce: 1,   startingHeight: 5,  settleTimeout: 6000 },
};

export const DICE_SIZE_PRESETS: Record<'small' | 'medium' | 'large', number> = {
  small:  4,
  medium: 6,
  large:  9,
};

const defaultPhysicsConfig = DICE_WEIGHT_PRESETS.medium;

const defaultVisualConfig = {
  theme: 'default',
  themeColor: '#ffffff',
  scale: 6,
  diceColor: '#ffffff',
  textColor: '#000000',
  trayColor: '#1a1a1a',
  wallStyle: 'hero-endless-clouds',
  wallRepeat: 2,
  wallColor: '#852f42',
  backgroundColor: '#852f42',
  backgroundStyle: 'hero-circuit-board',
  backgroundRepeat: 2,
};

export const defaultConfigs = {
  defaultStatSets,
  defaultActionSets,
  defaultPhysicsConfig,
  defaultVisualConfig,
};
