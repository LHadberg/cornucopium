'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, Group, Stack, TextInput, Switch, Select, ActionIcon, Paper, Text, Collapse, Divider, Popover } from '@mantine/core';
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconFolderPlus } from '@tabler/icons-react';
import type { Action, ActionSet, ConfigPanelHandle, DiceSelections, StatSet, Stats } from '../../_types/types';
import { useTranslation } from 'react-i18next';

interface ActionsConfigProps {
  actionSets: ActionSet[];
  statSets: StatSet[];
  onUpdate: (actionSets: ActionSet[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type DraftDie = Action['damageDice'][number] & { rawQuantity: string };
type DraftAction = Omit<Action, 'damageDice'> & { damageDice: DraftDie[] };
type DraftActionSet = Omit<ActionSet, 'actions'> & { actions: DraftAction[] };

const initDraft = (sets: ActionSet[]): DraftActionSet[] =>
  sets.map(s => ({ ...s, actions: s.actions.map(a => ({ ...a, damageDice: a.damageDice.map(d => ({ ...d, rawQuantity: String(d.quantity) })) })) }));

const sanitizeDraft = (sets: DraftActionSet[]): ActionSet[] =>
  sets.map(s => ({
    ...s,
    actions: s.actions.map(a => ({
      ...a,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      damageDice: a.damageDice.filter(d => d.rawQuantity.trim() !== '').map(({ rawQuantity, ...d }) => ({ ...d, quantity: Math.max(1, parseInt(rawQuantity) || 1) })),
    })),
  }));

const ActionsConfig = forwardRef<ConfigPanelHandle, ActionsConfigProps>(({ actionSets, statSets, onUpdate, onDirtyChange }, ref) => {
  const [draft, setDraft] = useState<DraftActionSet[]>(() => initDraft(actionSets));
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(new Set());
  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const savedRef = useRef(actionSets);
  savedRef.current = actionSets;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useImperativeHandle(ref, () => ({
    isDirty: () => JSON.stringify(sanitizeDraft(draftRef.current)) !== JSON.stringify(savedRef.current),
    save: () => onUpdateRef.current(sanitizeDraft(draftRef.current)),
    discard: () => setDraft(initDraft(savedRef.current)),
  }), []);

  useEffect(() => {
    onDirtyChangeRef.current?.(JSON.stringify(sanitizeDraft(draft)) !== JSON.stringify(actionSets));
  }, [draft, actionSets]);
  const { t } = useTranslation();

  const diceOptions = [
    { value: 'd4', label: t('diceTypes.d4') },
    { value: 'd6', label: t('diceTypes.d6') },
    { value: 'd8', label: t('diceTypes.d8') },
    { value: 'd10', label: t('diceTypes.d10') },
    { value: 'd12', label: t('diceTypes.d12') },
    { value: 'd20', label: t('diceTypes.d20') },
    { value: 'd100', label: t('diceTypes.d100') },
  ];

  const damageTypeOptions = [
    { value: '', label: t('damageTypes.none') },
    { value: 'acid', label: t('damageTypes.acid') },
    { value: 'bludgeoning', label: t('damageTypes.bludgeoning') },
    { value: 'cold', label: t('damageTypes.cold') },
    { value: 'fire', label: t('damageTypes.fire') },
    { value: 'force', label: t('damageTypes.force') },
    { value: 'lightning', label: t('damageTypes.lightning') },
    { value: 'necrotic', label: t('damageTypes.necrotic') },
    { value: 'piercing', label: t('damageTypes.piercing') },
    { value: 'poison', label: t('damageTypes.poison') },
    { value: 'psychic', label: t('damageTypes.psychic') },
    { value: 'radiant', label: t('damageTypes.radiant') },
    { value: 'slashing', label: t('damageTypes.slashing') },
    { value: 'thunder', label: t('damageTypes.thunder') },
  ];

  const statOptions = [
    { value: 'strength', label: t('statNames.strength') },
    { value: 'dexterity', label: t('statNames.dexterity') },
    { value: 'constitution', label: t('statNames.constitution') },
    { value: 'intelligence', label: t('statNames.intelligence') },
    { value: 'wisdom', label: t('statNames.wisdom') },
    { value: 'charisma', label: t('statNames.charisma') },
  ];

  const toggleSetExpanded = (id: string) => {
    setExpandedSetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleActionExpanded = (id: string) => {
    setExpandedActionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addActionSet = () => {
    const newSet: DraftActionSet = { id: Date.now().toString(), name: '', actions: [] };
    setDraft(prev => [...prev, newSet]);
    setExpandedSetIds(prev => new Set(prev).add(newSet.id));
  };

  const removeActionSet = (setIndex: number) => {
    setDraft(prev => prev.filter((_, i) => i !== setIndex));
  };

  const updateSetName = (setIndex: number, name: string) => {
    setDraft(prev => prev.map((s, i) => i === setIndex ? { ...s, name } : s));
  };

  const updateSetStatSetId = (setIndex: number, statSetId: string | null) => {
    setDraft(prev => prev.map((s, i) => i === setIndex ? { ...s, statSetId: statSetId ?? undefined } : s));
  };

  const addAction = (setIndex: number) => {
    const newAction: DraftAction = {
      id: Date.now().toString(),
      name: '',
      requiresD20: false,
      damageDice: [{ quantity: 1, dieType: 'd6', rawQuantity: '1' }],
    };
    setDraft(prev => prev.map((s, i) => i !== setIndex ? s : { ...s, actions: [...s.actions, newAction] }));
    setExpandedActionIds(prev => new Set(prev).add(newAction.id));
  };

  const removeAction = (setIndex: number, actionIndex: number) => {
    setDraft(prev => prev.map((s, i) => i !== setIndex ? s : {
      ...s,
      actions: s.actions.filter((_, j) => j !== actionIndex),
    }));
  };

  const updateAction = (setIndex: number, actionIndex: number, updates: Partial<DraftAction>) => {
    setDraft(prev => prev.map((s, i) => i !== setIndex ? s : {
      ...s,
      actions: s.actions.map((a, j) => j === actionIndex ? { ...a, ...updates } : a),
    }));
  };

  const addDamageDie = (setIndex: number, actionIndex: number) => {
    setDraft(prev => prev.map((s, i) => i !== setIndex ? s : {
      ...s,
      actions: s.actions.map((a, j) => j !== actionIndex ? a : {
        ...a,
        damageDice: [...a.damageDice, { quantity: 1, dieType: 'd6' as keyof DiceSelections, rawQuantity: '1' }],
      }),
    }));
  };

  const removeDamageDie = (setIndex: number, actionIndex: number, dieIndex: number) => {
    setDraft(prev => prev.map((s, i) => i !== setIndex ? s : {
      ...s,
      actions: s.actions.map((a, j) => j !== actionIndex ? a : {
        ...a,
        damageDice: a.damageDice.filter((_, k) => k !== dieIndex),
      }),
    }));
  };

  const updateDie = (setIndex: number, actionIndex: number, dieIndex: number, updates: Partial<DraftDie>) => {
    setDraft(prev => prev.map((s, i) => i !== setIndex ? s : {
      ...s,
      actions: s.actions.map((a, j) => j !== actionIndex ? a : {
        ...a,
        damageDice: a.damageDice.map((d, k) => k !== dieIndex ? d : { ...d, ...updates }),
      }),
    }));
  };

  return (
    <Stack gap="md" pb="xl">
      <Group justify="space-between">
        <Text size="xl" fw={700}>{t('actions.title')}</Text>
        <Button onClick={addActionSet} leftSection={<IconFolderPlus size={16} />} variant="light">
          {t('actions.addActionSet')}
        </Button>
      </Group>

      {draft.length === 0 && (
        <Text c="dimmed" size="sm" ta="center">{t('actions.noActionSets')}</Text>
      )}

      {draft.map((set, setIndex) => {
        const isSetExpanded = expandedSetIds.has(set.id);
        return (
          <Paper key={set.id} withBorder>
            {/* Action Set Header */}
            <Group
              justify="space-between"
              p="sm"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSetExpanded(set.id)}
            >
              <Text fw={700} size="sm" c={set.name ? undefined : 'dimmed'}>
                {set.name || t('actions.unnamedActionSet')}
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
                      size={{ base: 'md', md: 'sm' }}
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(set.id); }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
                    <Stack gap="xs" align="center">
                      <Text size="sm" fw={500}>{t('common.confirmDelete')}</Text>
                      <Group gap="xs">
                        <Button size="xs" color="red" onClick={(e) => { e.stopPropagation(); removeActionSet(setIndex); setConfirmDeleteId(null); }}>
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
                  {isSetExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </ActionIcon>
              </Group>
            </Group>

            <Collapse in={isSetExpanded}>
              <Stack gap="md" px="md" pb="md">
                <TextInput
                  placeholder={t('actions.actionSetNamePlaceholder')}
                  value={set.name}
                  onChange={(e) => updateSetName(setIndex, e.target.value)}
                />

                {statSets.length > 0 && (
                  <Select
                    label={t('actions.linkedStatSet')}
                    description={t('actions.linkedStatSetDescription')}
                    data={statSets.map((s) => ({ value: s.id, label: s.name || t('stats.unnamedStatSet') }))}
                    value={set.statSetId ?? null}
                    onChange={(id) => updateSetStatSetId(setIndex, id)}
                    clearable
                    comboboxProps={{ withinPortal: false }}
                  />
                )}

                {set.actions.length > 0 && <Divider label={t('actions.actionsLabel')} labelPosition="left" />}

                {set.actions.map((action, actionIndex) => {
                  const isActionExpanded = expandedActionIds.has(action.id);
                  return (
                    <Paper key={action.id} withBorder style={{ marginLeft: 8 }}>
                      <Group
                        justify="space-between"
                        p="sm"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActionExpanded(action.id)}
                      >
                        <Text fw={600} size="sm" c={action.name ? undefined : 'dimmed'}>
                          {action.name || t('actions.unnamedAction')}
                        </Text>
                        <Group gap={4}>
                          <Popover
                            opened={confirmDeleteId === action.id}
                            onClose={() => setConfirmDeleteId(null)}
                            position="bottom-end"
                            withArrow
                            withinPortal={false}
                          >
                            <Popover.Target>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                size={{ base: 'md', md: 'sm' }}
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(action.id); }}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Popover.Target>
                            <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
                              <Stack gap="xs" align="center">
                                <Text size="sm" fw={500}>{t('common.confirmDelete')}</Text>
                                <Group gap="xs">
                                  <Button size="xs" color="red" onClick={(e) => { e.stopPropagation(); removeAction(setIndex, actionIndex); setConfirmDeleteId(null); }}>
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
                            {isActionExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Collapse in={isActionExpanded}>
                        <Stack gap="md" px="md" pb="md">
                          <TextInput
                            placeholder={t('actions.actionNamePlaceholder')}
                            value={action.name}
                            onChange={(e) => updateAction(setIndex, actionIndex, { name: e.target.value })}
                          />

                          <Switch
                            label={t('actions.requiresAttackRoll')}
                            checked={action.requiresD20}
                            onChange={(e) => updateAction(setIndex, actionIndex, { requiresD20: e.currentTarget.checked })}
                          />

                          {action.requiresD20 && (
                            <>
                              <Switch
                                label={t('actions.proficient')}
                                checked={action.proficient ?? false}
                                onChange={(e) => updateAction(setIndex, actionIndex, { proficient: e.currentTarget.checked })}
                              />
                              <Select
                                label={t('actions.statModifier')}
                                data={statOptions}
                                value={action.statModifier ?? null}
                                onChange={(value) => updateAction(setIndex, actionIndex, { statModifier: (value ?? undefined) as keyof Stats | undefined })}
                                clearable
                                comboboxProps={{ withinPortal: false }}
                              />
                            </>
                          )}

                          <Text size="sm" fw={500}>{t('actions.damageDice')}</Text>

                          {action.damageDice.map((die, dieIndex) => (
                            <Group key={`${actionIndex}-${dieIndex}`}>
                              <TextInput
                                type="number"
                                placeholder="Qty"
                                value={die.rawQuantity}
                                onChange={(e) => updateDie(setIndex, actionIndex, dieIndex, { rawQuantity: e.target.value })}
                                style={{ width: 80 }}
                              />
                              <Select
                                data={diceOptions}
                                value={die.dieType}
                                onChange={(value) => updateDie(setIndex, actionIndex, dieIndex, { dieType: value as keyof DiceSelections })}
                                style={{ width: 90 }}
                                comboboxProps={{ withinPortal: false }}
                              />
                              <Select
                                data={damageTypeOptions}
                                value={die.damageType ?? ''}
                                onChange={(value) => updateDie(setIndex, actionIndex, dieIndex, { damageType: value ?? '' })}
                                style={{ width: 140 }}
                                comboboxProps={{ withinPortal: false }}
                              />
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => removeDamageDie(setIndex, actionIndex, dieIndex)}
                                disabled={action.damageDice.length === 1}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          ))}

                          <Button
                            variant="light"
                            onClick={() => addDamageDie(setIndex, actionIndex)}
                            leftSection={<IconPlus size={16} />}
                          >
                            {t('actions.addDamageDie')}
                          </Button>
                        </Stack>
                      </Collapse>
                    </Paper>
                  );
                })}

                <Button
                  variant="light"
                  onClick={() => addAction(setIndex)}
                  leftSection={<IconPlus size={16} />}
                >
                  {t('actions.addAction')}
                </Button>
              </Stack>
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
});

ActionsConfig.displayName = 'ActionsConfig';
export default ActionsConfig;
