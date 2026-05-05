"use client";

import { Group, Paper, SimpleGrid, Stack, Text, UnstyledButton, useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SelectionRow } from "./mtg-complete-grid";

// ── Constants (mirrors commander-selector) ────────────────────────────────────

const ARCHETYPES = ["Aggro", "Combo", "Control", "Midrange", "Stax", "Tempo", "Vorthos"];

const TAGS = [
  "-1/-1 Counters", "+1/+1 Counters",
  "Activated Abilities", "Ad Nauseam", "Adventures", "Advisors", "Affinity", "Aggro",
  "Aikido", "Airbending", "All Spells", "Allies", "Amass", "Angels", "Annihilator",
  "Anthems", "Apes", "Arcane", "Archers", "Aristocrats", "Artificers", "Artifacts",
  "Assassins", "Astartes", "Atogs", "Attack Triggers", "Attractions", "Auras", "Avatars",
  "Banding", "Barbarians", "Battles", "Bats", "Bears", "Beasts", "Berserkers",
  "Big Mana", "Birds", "Birthing Pod", "Blink", "Blood", "Bloodthirst", "Blue Moon",
  "Bobbleheads", "Bounce", "Burn",
  "Cantrips", "Card Draw", "Cascade", "Cats", "Caves", "cEDH", "Cephalids",
  "Charge Counters", "Chaos", "Cheerios", "Clerics", "Clones", "Clues", "Coin Flip",
  "Color Hack", "Combo", "Commander Matters", "Connive", "Constructs", "Control",
  "Convoke", "Counterspells", "Counters Matter", "Crabs", "Craft", "Creatureless",
  "Crime", "Curses", "Cybermen", "Cycling",
  "Daleks", "Dandan", "Day / Night", "Deathtouch", "Defenders", "Delirium", "Delver",
  "Demons", "Descend", "Deserts", "Detectives", "Devoid", "Devotion", "Die Roll",
  "Dinosaurs", "Discard", "Discover", "Dogs", "Donate", "Dragon's Approach", "Dragons",
  "Drakes", "Dredge", "Druids", "Dungeon", "Dwarves",
  "Earthbending", "Eggs", "Elders", "Eldrazi", "Elementals", "Elephants", "Elves",
  "Enchantress", "Energy", "Enrage", "Equipment", "ETB", "European Highlander", "Evoke", "Exalted",
  "Exile", "Experience Counters", "Exploit", "Explore", "Extra Combats", "Extra Turns",
  "Extra Upkeeps",
  "Faeries", "Fight", "Firebending", "Flash", "Flashback", "Fling", "Flying", "Food",
  "Forced Combat", "Foretell", "Foxes", "Freerunning", "Frogs", "Fungi",
  "Giants", "Glass Cannon", "Gnomes", "Goblins", "Gods", "Goats", "Golems",
  "Good Stuff", "Gorgons", "Graveyard", "Griffins", "Group Hug", "Group Slug",
  "Guildgates", "Gyruda Companion",
  "Halflings", "Hand Size", "Hare Apparent", "Haste", "Hatebears", "Hellbent", "Heroic",
  "Heroes", "Hippos", "Historic", "Horses", "Horrors", "Humans", "Hydras",
  "Illusions", "Impulse Draw", "Improvise", "Indestructible", "Infect", "Insects",
  "Jegantha Companion",
  "Kaheera Companion", "Keruga Companion", "Keywords", "Kicker", "Kithkin", "Knights", "Kor",
  "Land Animation", "Land Destruction", "Landfall", "Landwalk", "Lands Matter", "Legends",
  "Lessons", "Lhurgoyfs", "Life Exchange", "Lifedrain", "Lifegain", "Lizards", "Looting",
  "LTB Effects", "Lure", "Lurrus Companion",
  "Madness", "Mayhem", "Mercenaries", "Merfolk", "Mice", "Midrange", "Mill", "Minotaurs",
  "Modified Creatures", "Modular", "Monarch", "Monks", "Monkeys", "Moonfolk", "Morph",
  "Mounts", "Multicolor Matters", "Mutants", "Mutate", "Myr", "Myriad",
  "Necrons", "Nightmares", "Ninjas", "Ninjutsu",
  "Obosh Companion", "Offspring", "Oil Counters", "Old School", "Oozes", "Orcs", "Otters",
  "Outlaws",
  "Paradox", "Party", "Pegasi", "Persistent Petitioners", "Phasing", "Phoenixes",
  "Phyrexians", "Pillow Fort", "Pingers", "Pirates", "Plants", "Planeswalkers", "Plot",
  "Politics", "Polymorph", "Populate", "Power", "Praetors", "Primal Surge", "Prison",
  "Proliferate", "Prowess",
  "Rabbits", "Raccoons", "Rad Counters", "Ramp", "Rat Colony", "Rats", "Reach", "Rebels",
  "Reanimator", "Relentless Rats", "Robots", "Rock", "Rogues", "Rooms",
  "Saboteurs", "Sacrifice", "Sagas", "Samurai", "Saprolings", "Satyrs", "Scarecrows",
  "Scry", "Sea Creatures", "Self-Damage", "Self-Destruct", "Self-Discard", "Self-Mill",
  "Servos", "Shadowborn Apostles", "Shades", "Shamans", "Shapeshifters", "Sharks",
  "Shrines", "Skeletons", "Skulk", "Slime Against Humanity", "Slivers", "Snakes", "Sneak",
  "Sneak Attack", "Snow", "Soldiers", "Spacecraft", "Specters", "Speed", "Spell Copy",
  "Spellslinger", "Spiders", "Spirits", "Spore Counters", "Squad", "Squirrels", "Stax",
  "Stickers", "Stompy", "Stoneblade", "Storm", "Sunburst", "Sunforger", "Surveil",
  "Suspend", "Symbiotes",
  "Tap / Untap", "Tempest Hawk", "Tempo", "Theft", "The Ring", "Thopters", "Time Counters",
  "Time Lords", "Tokens", "Toolbox", "Topdeck", "Toughness Matters", "Towns", "Transform",
  "Treasure", "Treefolk", "Triggered Abilities", "Tron", "Turbo Fog", "Turtles", "Tyranids",
  "Type Hack",
  "Umori Companion", "Unblockable", "Unicorns", "Unnatural",
  "Vampires", "Vanilla", "Vehicles", "Villainous Choice", "Villains", "Voltron", "Voting",
  "Warriors", "Waterbending", "Web-slinging", "Weenies", "Werewolves", "Whales", "Wheels",
  "Wizards", "Wolves", "Wraiths", "Wurms",
  "X Spells",
  "Zoo", "Zirda Companion",
];

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

function countTags(selections: SelectionRow[]) {
  const filled = selections.filter((s) => !!s.commanderScryfallId);
  const tagCounts: Record<string, number> = {};
  for (const s of filled) {
    let tags: string[] = [];
    try { tags = JSON.parse(s.tags) as string[]; } catch { tags = []; }
    for (const t of tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }
  return TAGS
    .map((t) => ({ name: t, value: tagCounts[t] ?? 0 }))
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
const TAG_COLORS = [
  "#6741d9", "#ae3ec9", "#1971c2", "#2f9e44", "#e8590c", "#0c8599",
  "#f03e3e", "#74c0fc", "#a5d8ff", "#339af0", "#4dabf7", "#f59f00",
  "#087f5b", "#c92a2a", "#5c7cfa", "#94d82d", "#ffa94d", "#63e6be",
];

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
  { key: "tags",      titleKey: "mtg.charts.tags",       colors: TAG_COLORS },
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
    tags:      countTags(selections),
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
