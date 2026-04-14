/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@3d-dice/dice-box' {
  interface DiceBoxOptions {
    container?: HTMLElement | string;
    assetPath?: string;
    theme?: string;
    scale?: number;
    offscreen?: boolean;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    linearDamping?: number;
    angularDamping?: number;
    themeColor?: string;
  }

  class DiceBox {
    constructor(options?: DiceBoxOptions);
    init(): Promise<any>;
    updateConfig(updates: Partial<DiceBoxOptions>): void;
    roll(notation: string | string[]): Promise<any>;
    onRollComplete?: (results: any) => void;
    onThemeConfigLoaded?: (themeData: any) => void;
  }

  export default DiceBox;
}
