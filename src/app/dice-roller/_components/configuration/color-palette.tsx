'use client';

import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import styles from '../../_styles/VisualsConfig.module.css';

const COLORS = ['#e8dfcf', '#c9ad82', '#8b7355', '#5b4034', '#852f42', '#b25c38', '#2d4a2d', '#347a76', '#345c89', '#655180', '#666c76', '#242831'];

export default function ColorPalette({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const { t } = useTranslation();
  return <div className={styles.palette} role="group" aria-label={t('visuals.colorPalette')}>
    {COLORS.map((hex) => (
      <button key={hex} type="button" className={styles.swatch} style={{ backgroundColor: hex }}
        aria-label={t('visuals.chooseColor', { color: hex })} aria-pressed={value.toLowerCase() === hex}
        onClick={() => onChange(hex)}>
        {value.toLowerCase() === hex && <IconCheck size={16} color="white" style={{ filter: 'drop-shadow(0 1px 2px black)' }} />}
      </button>
    ))}
  </div>;
}
