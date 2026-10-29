"use client";

import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { CounterPressButton } from "./counter-press-button";
import styles from "../_styles/CommanderControls.module.css";

// Arcade Keys was selected from the five design prototypes.
// A stable slot identifies each commander independently, even when partners are hidden.
export function CommanderControls({ opponents, damage, onChange }: {
  opponents: { id: number; name: string; color: string; partnerCommanders: boolean }[];
  damage: Record<number, number>;
  onChange: (slot: number, delta: number) => void;
}) {
  const { t } = useTranslation();
  return <section data-commander-panel className={styles.panel} aria-label={t("lifeTracker.commanderDamage")}>
    {opponents.map((op) => <div data-commander-pair className={styles.pair} key={op.id}>
      {Array.from({ length: op.partnerCommanders ? 2 : 1 }, (_, index) => {
        const slot = op.id * 2 + index;
        const value = damage[slot] ?? 0;
        return <CounterPressButton key={slot}
          label={t("lifeTracker.commanderSlotDamage", { name: op.name, number: index + 1, value })}
          onChange={(delta) => onChange(slot, delta)}
          style={{ "--opponent": op.color } as CSSProperties}
          partner={index === 1}>
          <b>{value}</b>
          {value >= 21 && <span className={styles.lethal}>21+</span>}
        </CounterPressButton>;
      })}
    </div>)}
  </section>;
}
