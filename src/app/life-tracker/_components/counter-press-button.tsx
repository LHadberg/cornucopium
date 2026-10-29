"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import styles from "../_styles/CommanderControls.module.css";

export function CounterPressButton({ label, onChange, children, style, className, partner = false }: {
  label: string; onChange: (delta: number) => void; children: ReactNode; style: CSSProperties; className?: string; partner?: boolean;
}) {
  const { t } = useTranslation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const [press, setPress] = useState(false);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; setPress(false); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <button data-commander-key className={`${styles.damage} ${partner ? styles.partner : ""} ${className ?? ""}`} style={style}
    aria-label={`${label}. ${t("lifeTracker.commanderControlHint")}`}
    data-press={press || undefined}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      clear(); held.current = false; setPress(true);
      timer.current = setTimeout(() => { held.current = true; onChange(-1); setPress(false); }, 500);
    }}
    onPointerUp={() => clear()}
    onPointerCancel={() => { held.current = true; clear(); }}
    onLostPointerCapture={clear}
    onClick={() => { if (!held.current) onChange(1); held.current = false; }}
    onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); onChange(-1); } }}
    onContextMenu={(event) => event.preventDefault()}>{children}</button>;
}


