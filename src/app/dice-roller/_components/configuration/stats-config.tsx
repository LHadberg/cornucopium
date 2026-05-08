'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, Group, Stack, TextInput, ActionIcon, Paper, Text, Collapse, Divider, Popover } from '@mantine/core';
import { IconPlus, IconMinus, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { ConfigPanelHandle, StatSet, Stats } from '../../_types/types';
import { useTranslation } from 'react-i18next';

interface StatsConfigProps {
  statSets: StatSet[];
  onUpdate: (statSets: StatSet[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const calculateModifier = (value: number): number => Math.floor((value - 10) / 2);

const defaultStats = (): Stats => ({
  strength:     { name: 'Strength',     value: 10, modifier: 0 },
  dexterity:    { name: 'Dexterity',    value: 10, modifier: 0 },
  constitution: { name: 'Constitution', value: 10, modifier: 0 },
  intelligence: { name: 'Intelligence', value: 10, modifier: 0 },
  wisdom:       { name: 'Wisdom',       value: 10, modifier: 0 },
  charisma:     { name: 'Charisma',     value: 10, modifier: 0 },
});

const StatsConfig = forwardRef<ConfigPanelHandle, StatsConfigProps>(({ statSets, onUpdate, onDirtyChange }, ref) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<StatSet[]>(() =>
    statSets.map(s => ({ ...s, stats: { ...s.stats } }))
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(statSets.length === 1 ? [statSets[0]!.id] : [])
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const savedRef = useRef(statSets);
  savedRef.current = statSets;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useImperativeHandle(ref, () => ({
    isDirty: () => JSON.stringify(draftRef.current) !== JSON.stringify(savedRef.current),
    save: () => onUpdateRef.current(draftRef.current),
    discard: () => setDraft(savedRef.current.map(s => ({ ...s, stats: { ...s.stats } }))),
  }), []);

  useEffect(() => {
    onDirtyChangeRef.current?.(JSON.stringify(draft) !== JSON.stringify(statSets));
  }, [draft, statSets]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addStatSet = () => {
    const newSet: StatSet = {
      id: Date.now().toString(),
      name: '',
      proficiencyBonus: 2,
      stats: defaultStats(),
    };
    setDraft(prev => [...prev, newSet]);
    setExpandedIds(prev => new Set(prev).add(newSet.id));
  };

  const removeStatSet = (index: number) => {
    setDraft(prev => prev.filter((_, i) => i !== index));
  };

  const updateName = (index: number, name: string) => {
    setDraft(prev => prev.map((s, i) => i === index ? { ...s, name } : s));
  };

  const updateProficiencyBonus = (index: number, change: number) => {
    setDraft(prev => prev.map((s, i) => {
      if (i !== index) return s;
      const newPB = Math.max(1, Math.min(10, s.proficiencyBonus + change));
      return { ...s, proficiencyBonus: newPB };
    }));
  };

  const updateStat = (setIndex: number, statKey: keyof Stats, change: number) => {
    setDraft(prev => prev.map((s, i) => {
      if (i !== setIndex) return s;
      const currentValue = s.stats[statKey].value;
      const newValue = Math.max(1, Math.min(30, currentValue + change));
      return {
        ...s,
        stats: {
          ...s.stats,
          [statKey]: { ...s.stats[statKey], value: newValue, modifier: calculateModifier(newValue) },
        },
      };
    }));
  };

  return (
    <Stack gap="md" pb="xl">
      <Group justify="space-between">
        <Text size="xl" fw={700}>{t('stats.title')}</Text>
        <Button onClick={addStatSet} leftSection={<IconPlus size={16} />} variant="light">
          {t('stats.addStatSet')}
        </Button>
      </Group>

      {draft.length === 0 && (
        <Text c="dimmed" size="sm" ta="center">{t('stats.noStatSets')}</Text>
      )}

      {draft.map((set, setIndex) => {
        const isExpanded = expandedIds.has(set.id);
        return (
          <Paper key={set.id} withBorder>
            <Group
              justify="space-between"
              p="sm"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleExpanded(set.id)}
            >
              <Text fw={700} size="sm" c={set.name ? undefined : 'dimmed'}>
                {set.name || t('stats.unnamedStatSet')}
              </Text>
              <Group gap={4}>
                <Popover
                  opened={confirmDeleteId === set.id}
                  onClose={() => setConfirmDeleteId(null)}
                  position="bottom-end"
                  withArrow
                  withinPortal={false}
                >
                  <Popover.Target>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(set.id); }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
                    <Stack gap="xs" align="center">
                      <Text size="sm" fw={500}>{t('common.confirmDelete')}</Text>
                      <Group gap="xs">
                        <Button size="xs" color="red" onClick={(e) => { e.stopPropagation(); removeStatSet(setIndex); setConfirmDeleteId(null); }}>
                          {t('common.delete')}
                        </Button>
                        <Button size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>
                          {t('common.cancel')}
                        </Button>
                      </Group>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
                <ActionIcon variant="subtle" size="sm">
                  {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </ActionIcon>
              </Group>
            </Group>

            <Collapse in={isExpanded}>
              <Stack gap="md" px="md" pb="md">
                <TextInput
                  placeholder={t('stats.statSetNamePlaceholder')}
                  value={set.name}
                  onChange={(e) => updateName(setIndex, e.target.value)}
                />

                <Divider label={t('stats.proficiencyBonus')} labelPosition="left" />

                <Group align="center">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => updateProficiencyBonus(setIndex, -1)}
                    disabled={set.proficiencyBonus <= 1}
                  >
                    <IconMinus size={16} />
                  </ActionIcon>
                  <Text fw={700} size="lg" style={{ minWidth: 28, textAlign: 'center' }}>
                    +{set.proficiencyBonus}
                  </Text>
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => updateProficiencyBonus(setIndex, 1)}
                    disabled={set.proficiencyBonus >= 10}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Group>

                <Divider label={t('stats.abilityScores')} labelPosition="left" />

                {(Object.keys(set.stats) as Array<keyof Stats>).map((statKey) => (
                  <Paper key={statKey} p="sm" withBorder>
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Text fw={500} style={{ flex: '0 0 110px' }}>{t(`statNames.${statKey}`)}</Text>
                      <Text size="sm" c="dimmed" style={{ flex: 1, whiteSpace: 'nowrap' }}>
                        {t('stats.valueModifier', {
                          value: set.stats[statKey].value,
                          modifier: `${set.stats[statKey].modifier >= 0 ? '+' : ''}${set.stats[statKey].modifier}`,
                        })}
                      </Text>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => updateStat(setIndex, statKey, -1)}
                          disabled={set.stats[statKey].value <= 1}
                        >
                          <IconMinus size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => updateStat(setIndex, statKey, 1)}
                          disabled={set.stats[statKey].value >= 30}
                        >
                          <IconPlus size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
});

StatsConfig.displayName = 'StatsConfig';
export default StatsConfig;
