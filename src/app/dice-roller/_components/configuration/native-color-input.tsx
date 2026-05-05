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

const NativeColorInput: React.FC<NativeColorInputProps> = ({ value, onChange, label, description, style }) => {
  const [textValue, setTextValue] = useState(value);

  useEffect(() => {
    setTextValue(value);
  }, [value]);

  const handleTextChange = (v: string) => {
    setTextValue(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };

  const handleTextBlur = () => {
    if (!/^#[0-9a-fA-F]{6}$/.test(textValue)) setTextValue(value);
  };

  const safeValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';

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
              backgroundColor: safeValue,
              borderRadius: 4,
              border: '1px solid rgba(128,128,128,0.4)',
            }}
          />
          <input
            type="color"
            value={safeValue}
            onChange={(e) => {
              onChange(e.target.value);
              setTextValue(e.target.value);
            }}
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
