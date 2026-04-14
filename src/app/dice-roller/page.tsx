'use client';

import dynamic from 'next/dynamic';

const DiceAppWrapper = dynamic(
  () => import('./_components/dice-app').then((m) => m.DiceAppWrapper),
  { ssr: false }
);

export default function DiceRollerPage() {
  return (
    <div
      style={{
        margin: 'calc(-1 * var(--mantine-spacing-md))',
        height: 'calc(100dvh - var(--app-shell-header-height, 60px))',
        overflow: 'hidden',
        background: '#1a1b1e',
        isolation: 'isolate',
      }}
    >
      <DiceAppWrapper />
    </div>
  );
}
