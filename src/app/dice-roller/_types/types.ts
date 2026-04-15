export interface DiceSelections {
  d4: number;
  d6: number;
  d8: number;
  d10: number;
  d12: number;
  d20: number;
}

export interface DiceBoxConfig {
  gravity: number;
  mass: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
}

export interface VisualConfig {
  theme: string;
  themeColor: string;
  diceColor: string;
  textColor: string;
  trayColor: string;
  wallStyle: string;
  wallRepeat: number;
  wallColor: string;
  backgroundColor: string;
  backgroundStyle: string;
  backgroundRepeat: number;
}

export interface DiceResult {
  qty: number;
  value: number;
  rolls: Array<{ dieType: string; value?: number }>;
  values?: number[];
  groupId?: string;
  damageType?: string;
}

export interface Stat {
  name: string;
  value: number;
  modifier: number;
}

export interface Stats {
  strength: Stat;
  dexterity: Stat;
  constitution: Stat;
  intelligence: Stat;
  wisdom: Stat;
  charisma: Stat;
}

export type RollType = 'normal' | 'advantage' | 'disadvantage';

export interface Action {
  id: string;
  name: string;
  requiresD20: boolean;
  statModifier?: keyof Stats;
  damageDice: {
    quantity: number;
    dieType: keyof DiceSelections;
    damageType?: string;
  }[];
}

export interface ActionSet {
  id: string;
  name: string;
  actions: Action[];
}

export interface ActionsConfig {
  actionSets: ActionSet[];
}

export interface D20Result {
  rolls: number[];
  finalValue: number;
  modifier: number;
  rollType: RollType;
}

export interface DiceRollResult {
  data?: any;
  sides: number;
  dieType: string;
  groupId: number;
  rollId: number;
  theme: string;
  themeColor: string;
  value: number;
}
