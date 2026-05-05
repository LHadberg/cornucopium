'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Stack, Text, TextInput } from '@mantine/core';

interface NativeColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  style?: React.CSSProperties;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const NativeColorInput: React.FC<NativeColorInputProps> = ({ value, onChange, label, description, style }) => {
  const [localColor, setLocalColor] = useState(value);
  const [textValue, setTextValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalColor(value);
    setTextValue(value);
  }, [value]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const propagate = (v: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), 80);
  };

  const handleColorChange = (v: string) => {
    setLocalColor(v);
    setTextValue(v);
    propagate(v);
  };

  const handleTextChange = (v: string) => {
    setTextValue(v);
    if (HEX_RE.test(v)) {
      setLocalColor(v);
      propagate(v);
    }
  };

  const handleTextBlur = () => {
    if (!HEX_RE.test(textValue)) setTextValue(localColor);
  };

  const safeColor = HEX_RE.test(localColor) ? localColor : '#000000';

  return (
    <Stack gap={4} style={style}>
      {label && <Text size="sm" fw={500}>{label}</Text>}
      {description && <Text size="xs" c="dimmed">{description}</Text>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', flexShrink: 0, width: 36, height: 36 }}>
          <div
            style={{
              width: 36,
              height: 36,
              backgroundColor: safeColor,
              borderRadius: 4,
              border: '1px solid rgba(128,128,128,0.4)',
            }}
          />
          <input
            type="color"
            value={safeColor}
            onChange={(e) => handleColorChange(e.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              padding: 0,
              margin: 0,
              border: 'none',
            }}
          />
        </div>
        <TextInput
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          style={{ flex: 1 }}
          styles={{ input: { fontFamily: 'monospace', fontSize: 13 } }}
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </Stack>
  );
};

export default NativeColorInput;
