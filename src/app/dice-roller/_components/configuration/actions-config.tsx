'use client';

import React, { useState } from 'react';
import { Button, Group, Stack, TextInput, Switch, Select, ActionIcon, Paper, Text, Collapse } from '@mantine/core';
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { Action, DiceSelections, Stats } from '../../_types/types';
import { useTranslation } from 'react-i18next';

interface ActionsConfigProps {
  actions: Action[];
  onUpdate: (actions: Action[]) => void;
}

const ActionsConfig: React.FC<ActionsConfigProps> = ({ actions, onUpdate }) => {
  const [draft, setDraft] = useState<Action[]>(() => actions.map(a => ({ ...a, damageDice: a.damageDice.map(d => ({ ...d })) })));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();

  const diceOptions = [
    { value: 'd4', label: t('diceTypes.d4') },
    { value: 'd6', label: t('diceTypes.d6') },
    { value: 'd8', label: t('diceTypes.d8') },
    { value: 'd10', label: t('diceTypes.d10') },
    { value: 'd12', label: t('diceTypes.d12') },
    { value: 'd20', label: t('diceTypes.d20') },
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

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addNewAction = () => {
    const newAction: Action = {
      id: Date.now().toString(),
      name: '',
      requiresD20: false,
      damageDice: [{ quantity: 1, dieType: 'd6' }],
    };
    setDraft(prev => [...prev, newAction]);
    setExpandedIds(prev => new Set(prev).add(newAction.id));
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    setDraft(prev => prev.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const removeAction = (index: number) => {
    setDraft(prev => prev.filter((_, i) => i !== index));
  };

  const addDamageDie = (actionIndex: number) => {
    setDraft(prev => prev.map((a, i) => i !== actionIndex ? a : {
      ...a,
      damageDice: [...a.damageDice, { quantity: 1, dieType: 'd6' as keyof DiceSelections }],
    }));
  };

  const removeDamageDie = (actionIndex: number, dieIndex: number) => {
    setDraft(prev => prev.map((a, i) => i !== actionIndex ? a : {
      ...a,
      damageDice: a.damageDice.filter((_, j) => j !== dieIndex),
    }));
  };

  const updateDie = (actionIndex: number, dieIndex: number, updates: Partial<Action['damageDice'][number]>) => {
    setDraft(prev => prev.map((a, i) => i !== actionIndex ? a : {
      ...a,
      damageDice: a.damageDice.map((d, j) => j !== dieIndex ? d : { ...d, ...updates }),
    }));
  };

  return (
    <Stack gap="md" pb="xl">
      <Group justify="space-between">
        <Text size="xl" fw={700}>{t('actions.title')}</Text>
        <Group gap="xs">
          <Button onClick={addNewAction} leftSection={<IconPlus size={16} />} variant="light">
            {t('actions.addAction')}
          </Button>
          <Button onClick={() => onUpdate(draft)} color="green">
            {t('actions.save')}
          </Button>
        </Group>
      </Group>

      {draft.map((action, actionIndex) => {
        const isExpanded = expandedIds.has(action.id);
        return (
          <Paper key={action.id} withBorder>
            <Group
              justify="space-between"
              p="sm"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleExpanded(action.id)}
            >
              <Text fw={600} size="sm" c={action.name ? undefined : 'dimmed'}>
                {action.name || t('actions.unnamedAction')}
              </Text>
              <Group gap={4}>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); removeAction(actionIndex); }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" size="sm">
                  {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </ActionIcon>
              </Group>
            </Group>

            <Collapse in={isExpanded}>
              <Stack gap="md" px="md" pb="md">
                <TextInput
                  placeholder={t('actions.actionNamePlaceholder')}
                  value={action.name}
                  onChange={(e) => updateAction(actionIndex, { name: e.target.value })}
                />

                <Switch
                  label={t('actions.requiresAttackRoll')}
                  checked={action.requiresD20}
                  onChange={(e) => updateAction(actionIndex, { requiresD20: e.currentTarget.checked })}
                />

                {action.requiresD20 && (
                  <Select
                    label={t('actions.statModifier')}
                    data={statOptions}
                    value={action.statModifier}
                    onChange={(value) => updateAction(actionIndex, { statModifier: value as keyof Stats })}
                    comboboxProps={{ withinPortal: false }}
                  />
                )}

                <Text size="sm" fw={500}>{t('actions.damageDice')}</Text>

                {action.damageDice.map((die, dieIndex) => (
                  <Group key={`${actionIndex}-${dieIndex}`}>
                    <TextInput
                      type="number"
                      placeholder="Qty"
                      value={die.quantity}
                      onChange={(e) => updateDie(actionIndex, dieIndex, { quantity: parseInt(e.target.value) || 1 })}
                      style={{ width: 80 }}
                    />
                    <Select
                      data={diceOptions}
                      value={die.dieType}
                      onChange={(value) => updateDie(actionIndex, dieIndex, { dieType: value as keyof DiceSelections })}
                      style={{ width: 90 }}
                      comboboxProps={{ withinPortal: false }}
                    />
                    <Select
                      data={damageTypeOptions}
                      value={die.damageType ?? ''}
                      onChange={(value) => updateDie(actionIndex, dieIndex, { damageType: value ?? '' })}
                      style={{ width: 140 }}
                      comboboxProps={{ withinPortal: false }}
                    />
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => removeDamageDie(actionIndex, dieIndex)}
                      disabled={action.damageDice.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}

                <Button
                  variant="light"
                  onClick={() => addDamageDie(actionIndex)}
                  leftSection={<IconPlus size={16} />}
                >
                  {t('actions.addDamageDie')}
                </Button>
              </Stack>
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default ActionsConfig;
