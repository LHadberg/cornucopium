"use client";

import { Group, Paper, SimpleGrid, Stack, Text, UnstyledButton, useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SelectionRow } from "./mtg-complete-grid";

// ── Constants (mirrors commander-selector) ────────────────────────────────────

const ARCHETYPES = ["Aggro", "Combo", "Control", "Midrange", "Stax", "Tempo", "Vorthos"];

// ── Data aggregation ──────────────────────────────────────────────────────────

function countBrackets(selections: SelectionRow[], bracketLabel: (n: string) => string) {
  const filled = selections.filter((s) => !!s.commanderScryfallId);
  return ["1", "2", "3", "4", "5"]
    .map((v) => ({
      name: bracketLabel(v),
      value: filled.filter((s) => s.bracket === v).length,
    }))
    .filter((d) => d.value > 0);
}

function countArchetypes(selections: SelectionRow[]) {
  const filled = selections.filter((s) => !!s.commanderScryfallId);
  return ARCHETYPES
    .map((a) => ({
      name: a,
      value: filled.filter((s) => s.archetype === a).length,
    }))
    .filter((d) => d.value > 0);
}

// ── Chart colours ─────────────────────────────────────────────────────────────

// Power-level gradient: casual green → teal → amber → orange → competitive red
const BRACKET_COLORS = ["#2f9e44", "#0c8599", "#f59f00", "#e8590c", "#c92a2a"];
const ARCHETYPE_COLORS = ["#f03e3e", "#ae3ec9", "#1971c2", "#2f9e44", "#e8590c", "#0c8599"];

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry {
  fill?: string;
  color?: string;
  name?: string;
  value?: number;
  payload?: { name?: string; value?: number };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const color = (entry?.fill ?? entry?.color ?? "#888") as string;
  const name = String(entry?.name ?? entry?.payload?.name ?? "");
  const value = entry?.value ?? entry?.payload?.value ?? 0;

  return (
    <div
      style={{
        background: isDark ? theme.colors.dark[7] : "#fff",
        border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <span style={{ color, fontWeight: 600 }}>{name}</span>
      <br />
      <span style={{ color: isDark ? theme.colors.dark[1] : theme.colors.gray[7] }}>
        {value} {Number(value) === 1 ? t('mtg.charts.deck') : t('mtg.charts.decks')}
      </span>
    </div>
  );
}

// ── Single chart panel ────────────────────────────────────────────────────────

interface MiniChartProps {
  title: string;
  data: { name: string; value: number }[];
  colors: string[];
}

function MiniChart({ title, data, colors }: MiniChartProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const legendColor = isDark ? "#adb5bd" : "#495057";

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5}>
        {title}
      </Text>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius="40%"
            outerRadius="65%"
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length] ?? colors[0]!} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: 11, color: legendColor }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Stack>
  );
}

const CHART_DEFS = [
  { key: "bracket",   titleKey: "mtg.charts.bracket",    colors: BRACKET_COLORS },
  { key: "archetype", titleKey: "mtg.charts.archetypes", colors: ARCHETYPE_COLORS },
] as const;

// ── Public component ──────────────────────────────────────────────────────────

interface SelectionChartsProps {
  selections: SelectionRow[];
}

export function SelectionCharts({ selections }: SelectionChartsProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useLocalStorage({
    key: "mtg-stats-expanded",
    defaultValue: false,
  });

  const filled = selections.filter((s) => !!s.commanderScryfallId);
  if (filled.length === 0) return null;

  const dataByKey = {
    bracket:   countBrackets(selections, (n) => t('mtg.charts.bracketLabel', { number: n })),
    archetype: countArchetypes(selections),
  };

  const visibleCharts = CHART_DEFS.filter((c) => dataByKey[c.key].length > 0);
  const hasAnyChart = visibleCharts.length > 0;

  return (
    <Stack gap="xs">
      <UnstyledButton onClick={() => setOpened((v) => !v)}>
        <Group gap="xs">
          <Text size="sm" fw={500}>{t('mtg.charts.collectionStats')}</Text>
          {opened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </Group>
      </UnstyledButton>

      <div
        style={{
          display: "grid",
          gridTemplateRows: opened ? "1fr" : "0fr",
          transition: "grid-template-rows 500ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <Paper withBorder p="md" radius="md">
            {hasAnyChart ? (
              <SimpleGrid cols={{ base: 1, sm: visibleCharts.length }} spacing="xl">
                {visibleCharts.map((c) => (
                  <MiniChart key={c.key} title={t(c.titleKey)} data={dataByKey[c.key]} colors={c.colors} />
                ))}
              </SimpleGrid>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {t('mtg.charts.statsEmpty')}
              </Text>
            )}
          </Paper>
        </div>
      </div>
    </Stack>
  );
}
