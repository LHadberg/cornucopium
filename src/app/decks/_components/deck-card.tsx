"use client";

import {
  ActionIcon,
  Button,
  Card,
  Collapse,
  Combobox,
  Divider,
  Group,
  HoverCard,
  Image,
  InputBase,
  Loader,
  MultiSelect,
  Popover,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconDots,
  IconExternalLink,
  IconLayersIntersect,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type { Deck as DeckRow } from "../../../../generated/prisma";
import {
  COLOR_COMBINATIONS,
  ColorlessSymbol,
  CommanderCardBody,
  ManaSymbol,
} from "~/app/_components/commander-card-body";
import { api } from "~/trpc/react";

// ── Constants ─────────────────────────────────────────────────────────────────

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

const ARCHETYPES = [
  { value: "Aggro", label: "Aggro" },
  { value: "Combo", label: "Combo" },
  { value: "Control", label: "Control" },
  { value: "Midrange", label: "Midrange" },
  { value: "Stax", label: "Stax" },
  { value: "Tempo", label: "Tempo" },
  { value: "Vorthos", label: "Vorthos" },
];

const BRACKETS = [
  { value: "1", label: "1 — Exhibition" },
  { value: "2", label: "2 — Core" },
  { value: "3", label: "3 — Upgraded" },
  { value: "4", label: "4 — Optimized" },
  { value: "5", label: "5 — cEDH" },
];

const COLOR_ORDER = ["w", "u", "b", "r", "g"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScryfallCard {
  id: string;
  name: string;
  type_line: string;
  mana_cost?: string;
  layout?: string;
  oracle_text?: string;
  color_identity?: string[];
  image_uris?: { normal: string; art_crop: string };
  card_faces?: { oracle_text?: string; image_uris?: { normal: string; art_crop: string } }[];
}

type PartnerType = "partner" | "partner-with" | "background" | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch { return false; }
}

function colorIdToLetters(colorId: string | null): string[] {
  if (!colorId || colorId === "c") return [];
  const letters = colorId.split("").map((c) => c.toUpperCase()).filter((c) => ["W","U","B","R","G"].includes(c));
  return COLOR_ORDER.map((c) => c.toUpperCase()).filter((c) => letters.includes(c));
}

function colorIdentityToColorId(identity: string[]): string | null {
  if (identity.length === 0) return "c";
  const lower = [...new Set(identity.map((c) => c.toLowerCase()))];
  return COLOR_ORDER.filter((c) => lower.includes(c)).join("") || "c";
}

function cardImage(card: ScryfallCard): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

function cardArtCrop(card: ScryfallCard): string | null {
  return card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop ?? null;
}

function getOracleText(card: ScryfallCard): string {
  return card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? "";
}

function getPartnerType(card: ScryfallCard): PartnerType {
  const text = getOracleText(card);
  if (/choose a background/i.test(text)) return "background";
  if (/partner with /i.test(text)) return "partner-with";
  if (/\bpartner\b/i.test(text)) return "partner";
  return null;
}

function getPartnerWithName(card: ScryfallCard): string | null {
  const match = getOracleText(card).match(/partner with ([^\n(]+)/i);
  return match ? (match[1]!.trim()) : null;
}

function hydrateCard(
  id: string | null, name: string | null, typeLine: string | null,
  image: string | null, artCrop: string | null,
): ScryfallCard | null {
  if (!name) return null;
  return { id: id ?? "", name, type_line: typeLine ?? "", image_uris: image && artCrop ? { normal: image, art_crop: artCrop } : undefined };
}

async function scryfallSearch(q: string): Promise<ScryfallCard[]> {
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=name&unique=cards`,
    { headers: { "User-Agent": "Cornucopium/1.0", Accept: "application/json" } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { data: ScryfallCard[] };
  return data.data.slice(0, 10);
}

const searchPartners    = (q: string) => scryfallSearch(`is:commander oracle:Partner ${q}`);
const searchBackgrounds = (q: string) => scryfallSearch(`t:background ${q}`);
const searchByExactName = (name: string) => scryfallSearch(`!"${name}"`);
const searchCompanions  = (q: string) => scryfallSearch(`keyword:companion t:creature ${q}`);

// ── Sub-components ────────────────────────────────────────────────────────────

interface CardSearchProps {
  placeholder: string;
  query: string;
  results: ScryfallCard[];
  loading: boolean;
  store: ReturnType<typeof useCombobox>;
  onQueryChange: (q: string) => void;
  onSelect: (card: ScryfallCard | null) => void;
}

function CardSearch({ placeholder, query, results, loading, store, onQueryChange, onSelect }: CardSearchProps) {
  return (
    <Combobox store={store} onOptionSubmit={(id) => {
      onSelect(results.find((c) => c.id === id) ?? null);
      store.closeDropdown();
    }}>
      <Combobox.Target>
        <InputBase
          size="xs" placeholder={placeholder} value={query}
          onChange={(e) => { onQueryChange(e.currentTarget.value); store.openDropdown(); }}
          onFocus={() => query.length >= 2 && store.openDropdown()}
          onBlur={() => store.closeDropdown()}
          rightSection={loading ? <Loader size={12} /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {results.length > 0 ? results.map((card) => (
            <Combobox.Option value={card.id} key={card.id}>
              <HoverCard width={268} position="right" openDelay={200} closeDelay={0} withinPortal middlewares={{ flip: true, shift: true }}>
                <HoverCard.Target>
                  <div>
                    <Text size="xs" fw={500}>{card.name}</Text>
                    <Text size="xs" c="dimmed">{card.type_line}</Text>
                  </div>
                </HoverCard.Target>
                {cardImage(card) && (
                  <HoverCard.Dropdown p={4}>
                    <Image src={cardImage(card)!} alt={card.name} radius={20} loading="lazy" style={{ width: "min(260px, calc(100vw - 16px))" }} />
                  </HoverCard.Dropdown>
                )}
              </HoverCard>
            </Combobox.Option>
          )) : (
            <Combobox.Empty>
              <Text size="xs">{loading ? "Searching…" : query.length >= 2 ? "No results" : "Type to search"}</Text>
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

interface TagSelectorProps {
  tags: string[];
  setTags: (v: string[]) => void;
  favoriteTag: string | null;
  setFavoriteTag: (v: string | null) => void;
}

function TagSelector({ tags, setTags, favoriteTag, setFavoriteTag }: TagSelectorProps) {
  return (
    <MultiSelect
      size="xs" placeholder="Tags" data={TAGS} value={tags}
      onChange={(next) => { setTags(next); if (favoriteTag && !next.includes(favoriteTag)) setFavoriteTag(null); }}
      searchable clearable maxDropdownHeight={200}
      renderOption={({ option, checked }) => (
        <Group justify="space-between" w="100%" wrap="nowrap">
          <Text size="xs">{option.label}</Text>
          {checked && (
            <ActionIcon size="xs" variant="subtle"
              color={favoriteTag === option.value ? "yellow" : "gray"}
              onClick={(e) => { e.stopPropagation(); setFavoriteTag(favoriteTag === option.value ? null : option.value); }}
            >
              {favoriteTag === option.value ? <IconStarFilled size={11} /> : <IconStar size={11} />}
            </ActionIcon>
          )}
        </Group>
      )}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DeckCard({ deck, onDelete }: { deck: DeckRow; onDelete: () => void }) {
  // ── Expand / collapse ──────────────────────────────────────────────────────
  const [expanded, { open, close }] = useDisclosure(false);
  const [collapseVisible, setCollapseVisible] = useState(false);

  const handleToggle = () => {
    if (!expanded) { setCollapseVisible(true); open(); }
    else { close(); }
  };

  // ── Form state ─────────────────────────────────────────────────────────────
  const initTags: string[] = (() => { try { return JSON.parse(deck.tags) as string[]; } catch { return []; } })();

  const [deckName, setDeckName] = useState(deck.name ?? "");
  const [hasCompanion, setHasCompanion] = useState(!!deck.companionName);
  const [allowRule0, setAllowRule0] = useState(false);
  const [bracket, setBracket] = useState<string | null>(deck.bracket ?? null);
  const [tags, setTags] = useState<string[]>(initTags);
  const [favoriteTag, setFavoriteTag] = useState<string | null>(deck.favoriteTag ?? null);
  const [archetype, setArchetype] = useState<string | null>(deck.archetype ?? null);
  const [deckListUrl, setDeckListUrl] = useState<string | null>(deck.deckListUrl ?? null);

  // Commander
  const cmdStore = useCombobox({ onDropdownClose: () => cmdStore.resetSelectedOption() });
  const [commanderQuery, setCommanderQuery] = useState(deck.commanderName ?? "");
  const [debouncedCmdQuery] = useDebouncedValue(commanderQuery, 300);
  const [commanderResults, setCommanderResults] = useState<ScryfallCard[]>([]);
  const [commanderLoading, setCommanderLoading] = useState(false);
  const [commander, setCommander] = useState<ScryfallCard | null>(
    () => hydrateCard(deck.commanderScryfallId, deck.commanderName, deck.commanderTypeLine, deck.commanderImage, deck.commanderArtCrop)
  );

  // Partner — derived from commander oracle text; savedPartnerType used when oracle_text absent
  const [savedPartnerType, setSavedPartnerType] = useState<PartnerType>(deck.partnerType as PartnerType ?? null);
  const ptnStore = useCombobox({ onDropdownClose: () => ptnStore.resetSelectedOption() });
  const [partnerQuery, setPartnerQuery] = useState(deck.partnerName ?? "");
  const [debouncedPtnQuery] = useDebouncedValue(partnerQuery, 300);
  const [partnerResults, setPartnerResults] = useState<ScryfallCard[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partner, setPartner] = useState<ScryfallCard | null>(
    () => hydrateCard(deck.partnerScryfallId, deck.partnerName, deck.partnerTypeLine, deck.partnerImage, deck.partnerArtCrop)
  );

  // Companion
  const cmpStore = useCombobox({ onDropdownClose: () => cmpStore.resetSelectedOption() });
  const [companionQuery, setCompanionQuery] = useState(deck.companionName ?? "");
  const [debouncedCmpQuery] = useDebouncedValue(companionQuery, 300);
  const [companionResults, setCompanionResults] = useState<ScryfallCard[]>([]);
  const [companionLoading, setCompanionLoading] = useState(false);
  const [companion, setCompanion] = useState<ScryfallCard | null>(
    () => hydrateCard(deck.companionScryfallId, deck.companionName, deck.companionTypeLine, deck.companionImage, deck.companionArtCrop)
  );

  const userModified = useRef(false);
  const enrichedCmdId = useRef<string | null>(null);
  const mark = () => { userModified.current = true; };

  // Derived partner state
  const partnerType: PartnerType = commander ? (getPartnerType(commander) || savedPartnerType) : null;
  const partnerWithName = partnerType === "partner-with" ? getPartnerWithName(commander!) : null;
  const partnerLabel =
    partnerType === "background" ? "Background" :
    partnerType === "partner-with" ? "Partner with" :
    partnerType === "partner" ? "Partner" : null;

  // ── Effects ────────────────────────────────────────────────────────────────

  // Enrich commander with oracle_text so partner type can be derived after hydration
  useEffect(() => {
    if (!commander?.id || commander.oracle_text !== undefined) return;
    if (enrichedCmdId.current === commander.id) return;
    enrichedCmdId.current = commander.id;
    fetch(`https://api.scryfall.com/cards/${commander.id}`)
      .then((r) => r.ok ? r.json() as Promise<ScryfallCard> : null)
      .then((data) => {
        if (data) setCommander((prev) => prev ? { ...prev, oracle_text: data.oracle_text ?? "", card_faces: data.card_faces, layout: data.layout } : prev);
      })
      .catch(() => undefined);
  }, [commander?.id]);

  // Commander search
  useEffect(() => {
    if (!userModified.current) return;
    if (debouncedCmdQuery.trim().length < 2) { setCommanderResults([]); return; }
    setCommanderLoading(true);
    scryfallSearch(allowRule0 ? debouncedCmdQuery : `is:commander ${debouncedCmdQuery}`)
      .then(setCommanderResults).finally(() => setCommanderLoading(false));
  }, [debouncedCmdQuery, allowRule0]);

  // Reset / auto-resolve partner when commander changes
  useEffect(() => {
    if (!userModified.current) return;
    if (!commander || !partnerType) {
      setPartner(null); setPartnerQuery(""); setPartnerResults([]); setSavedPartnerType(null);
      return;
    }
    if (partnerType === "partner-with" && partnerWithName) {
      setPartnerLoading(true);
      searchByExactName(partnerWithName)
        .then((res) => { const card = res[0] ?? null; setPartner(card); setPartnerQuery(card?.name ?? partnerWithName); })
        .finally(() => setPartnerLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commander?.id]);

  // Partner search (plain partner / background)
  useEffect(() => {
    if (!userModified.current) return;
    if (partnerType !== "partner" && partnerType !== "background") { setPartnerResults([]); return; }
    if (debouncedPtnQuery.trim().length < 2) { setPartnerResults([]); return; }
    setPartnerLoading(true);
    (partnerType === "background" ? searchBackgrounds : searchPartners)(debouncedPtnQuery)
      .then(setPartnerResults).finally(() => setPartnerLoading(false));
  }, [debouncedPtnQuery, partnerType]);

  // Companion search
  useEffect(() => {
    if (!userModified.current || !hasCompanion) { setCompanionResults([]); return; }
    if (debouncedCmpQuery.trim().length < 2) { setCompanionResults([]); return; }
    setCompanionLoading(true);
    searchCompanions(debouncedCmpQuery).then(setCompanionResults).finally(() => setCompanionLoading(false));
  }, [debouncedCmpQuery, hasCompanion]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const utils = api.useUtils();
  const updateDeck = api.decks.update.useMutation({ onSuccess: () => void utils.decks.getAll.invalidate() });
  const setAsActiveSelection = api.decks.setAsActiveSelection.useMutation({ onSuccess: () => void utils.mtg.getSelections.invalidate() });

  const saveJson = JSON.stringify({
    deckName, bracket, tags, favoriteTag, archetype, deckListUrl, hasCompanion,
    cmdId: commander?.id ?? null,
    ptnId: partner?.id ?? null,
    cmpId: companion?.id ?? null,
  });
  const [debouncedSaveJson] = useDebouncedValue(saveJson, 1000);

  useEffect(() => {
    if (!userModified.current) return;
    const allColors = [...(commander?.color_identity ?? []), ...(partner?.color_identity ?? [])];
    const colorId = allColors.length > 0 ? colorIdentityToColorId(allColors) : deck.colorId;
    updateDeck.mutate({
      id: deck.id,
      name: deckName || null,
      commanderScryfallId: commander?.id ?? null,
      commanderName: commander?.name ?? null,
      commanderTypeLine: commander?.type_line ?? null,
      commanderImage: commander ? cardImage(commander) : null,
      commanderArtCrop: commander ? cardArtCrop(commander) : null,
      partnerScryfallId: partnerType ? (partner?.id ?? null) : null,
      partnerName: partnerType ? (partner?.name ?? null) : null,
      partnerTypeLine: partnerType ? (partner?.type_line ?? null) : null,
      partnerImage: partnerType && partner ? cardImage(partner) : null,
      partnerArtCrop: partnerType && partner ? cardArtCrop(partner) : null,
      partnerType: partnerType,
      companionScryfallId: hasCompanion ? (companion?.id ?? null) : null,
      companionName: hasCompanion ? (companion?.name ?? null) : null,
      companionTypeLine: hasCompanion ? (companion?.type_line ?? null) : null,
      companionImage: hasCompanion && companion ? cardImage(companion) : null,
      companionArtCrop: hasCompanion && companion ? cardArtCrop(companion) : null,
      bracket: bracket as "1" | "2" | "3" | "4" | "5" | null,
      tags: tags as Parameters<typeof updateDeck.mutate>[0]["tags"],
      favoriteTag: favoriteTag as Parameters<typeof updateDeck.mutate>[0]["favoriteTag"],
      archetype: archetype as Parameters<typeof updateDeck.mutate>[0]["archetype"],
      deckListUrl,
      colorId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSaveJson]);

  // ── Derived display ────────────────────────────────────────────────────────
  const displayName = deckName.trim() || commander?.name || deck.commanderName || "Unnamed";
  const colors = colorIdToLetters(deck.colorId);
  const isColorless = deck.colorId === "c";
  const bracketLabel = bracket ? (BRACKETS.find((b) => b.value === bracket)?.label ?? null) : null;
  const displayTag = favoriteTag ?? tags[0] ?? null;
  const colorComb = COLOR_COMBINATIONS.find((c) => c.id === (deck.colorId ?? "c"));
  const colorName = colorComb?.name ?? deck.colorId ?? "Unknown";
  const nameMatchesCommander = displayName === (commander?.name ?? deck.commanderName);

  const handleSetInMtgComplete = () => {
    if (!deck.colorId) return;
    setAsActiveSelection.mutate({ id: deck.id });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card withBorder padding="sm">
      {/* Header */}
      <Group justify="space-between" wrap="nowrap" mb={collapseVisible ? "xs" : 0}>
        <Text size="xs" fw={700} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>{displayName}</Text>
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {isColorless ? <ColorlessSymbol /> : colors.length === 0 ? null : colors.map((c) => <ManaSymbol key={c} color={c} />)}
          {isValidUrl(deckListUrl) && (
            <Tooltip label="Open deck list" withArrow position="top" openDelay={400}>
              <ActionIcon size="xs" variant="subtle" color="blue" component="a" href={deckListUrl!} target="_blank" rel="noopener noreferrer">
                <IconExternalLink size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={expanded ? "Collapse" : "Edit"} withArrow position="top" openDelay={400}>
            <ActionIcon size="xs" variant="subtle" onClick={handleToggle}>
              {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </ActionIcon>
          </Tooltip>
          <Popover position="bottom-end" withArrow shadow="sm" width={200} withinPortal>
            <Popover.Target>
              <ActionIcon size="xs" variant="subtle" aria-label="Options">
                <IconDots size={14} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown p="xs">
              <Stack gap="xs">
                <Switch
                  size="xs" label="Rule 0" labelPosition="left" checked={allowRule0}
                  onChange={(e) => setAllowRule0(e.currentTarget.checked)}
                  styles={{ body: { justifyContent: "space-between", width: "100%" } }}
                />
                <Switch
                  size="xs" label="Companion" labelPosition="left" checked={hasCompanion}
                  onChange={(e) => {
                    mark();
                    setHasCompanion(e.currentTarget.checked);
                    if (!e.currentTarget.checked) { setCompanion(null); setCompanionQuery(""); setCompanionResults([]); }
                  }}
                  styles={{ body: { justifyContent: "space-between", width: "100%" } }}
                />
                <Divider />
                <Button
                  size="xs" variant="subtle" color="indigo"
                  leftSection={<IconLayersIntersect size={12} />}
                  fullWidth justify="flex-start"
                  disabled={!deck.colorId} loading={setAsActiveSelection.isPending}
                  onClick={handleSetInMtgComplete}
                >
                  Set deck in mtg-complete
                </Button>
                <Divider />
                <Button
                  size="xs" variant="subtle" color="red"
                  leftSection={<IconTrash size={12} />}
                  fullWidth justify="flex-start"
                  onClick={onDelete}
                >
                  Delete
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </Group>

      {/* Contracted summary */}
      {!collapseVisible && (
        <CommanderCardBody
          commanderName={commander?.name ?? deck.commanderName}
          commanderArtCrop={commander ? cardArtCrop(commander) : deck.commanderArtCrop}
          commanderImage={commander ? cardImage(commander) : deck.commanderImage}
          partnerName={partnerType ? (partner?.name ?? deck.partnerName) : null}
          partnerLabel={partnerLabel ?? undefined}
          partnerArtCrop={partnerType && partner ? cardArtCrop(partner) : (partnerType ? deck.partnerArtCrop : null)}
          partnerImage={partnerType && partner ? cardImage(partner) : (partnerType ? deck.partnerImage : null)}
          companionName={hasCompanion ? (companion?.name ?? deck.companionName) : null}
          companionArtCrop={hasCompanion && companion ? cardArtCrop(companion) : (hasCompanion ? deck.companionArtCrop : null)}
          companionImage={hasCompanion && companion ? cardImage(companion) : (hasCompanion ? deck.companionImage : null)}
          bracketLabel={bracketLabel}
          displayTag={displayTag}
          archetype={archetype}
          visual={true}
          emptyText="No commander"
          hideCommanderName={nameMatchesCommander}
        />
      )}

      {/* Edit fields */}
      <Collapse in={expanded} onTransitionEnd={() => { if (!expanded) setCollapseVisible(false); }}>
        <Stack gap="xs">
          <TextInput
            size="xs" placeholder="Deck name (optional)"
            value={deckName}
            onChange={(e) => { mark(); setDeckName(e.currentTarget.value); }}
          />

          <Text size="xs" c="dimmed" fw={500}>Commander</Text>
          <CardSearch
            placeholder="Search commander…"
            query={commanderQuery} results={commanderResults} loading={commanderLoading} store={cmdStore}
            onQueryChange={(q) => { mark(); setCommanderQuery(q); setCommander(null); setSavedPartnerType(null); }}
            onSelect={(card) => { mark(); setCommander(card); setCommanderQuery(card?.name ?? ""); }}
          />

          {partnerType && (
            <>
              <Text size="xs" c="dimmed" fw={500}>{partnerLabel}</Text>
              {partnerType === "partner-with" ? (
                <InputBase size="xs" value={partnerLoading ? "Loading…" : (partnerQuery || (partnerWithName ?? ""))} disabled rightSection={partnerLoading ? <Loader size={12} /> : undefined} />
              ) : (
                <CardSearch
                  placeholder={partnerType === "background" ? "Search background…" : "Search partner…"}
                  query={partnerQuery} results={partnerResults} loading={partnerLoading} store={ptnStore}
                  onQueryChange={(q) => { mark(); setPartnerQuery(q); setPartner(null); }}
                  onSelect={(card) => { mark(); setPartner(card); setPartnerQuery(card?.name ?? ""); }}
                />
              )}
            </>
          )}

          {hasCompanion && (
            <>
              <Text size="xs" c="dimmed" fw={500}>Companion</Text>
              <CardSearch
                placeholder="Search companion…"
                query={companionQuery} results={companionResults} loading={companionLoading} store={cmpStore}
                onQueryChange={(q) => { mark(); setCompanionQuery(q); setCompanion(null); }}
                onSelect={(card) => { mark(); setCompanion(card); setCompanionQuery(card?.name ?? ""); }}
              />
            </>
          )}

          <Select
            size="xs" placeholder="Bracket" data={BRACKETS} value={bracket} clearable
            onChange={(v) => { mark(); setBracket(v); }}
          />
          <TagSelector
            tags={tags} setTags={(v) => { mark(); setTags(v); }}
            favoriteTag={favoriteTag} setFavoriteTag={(v) => { mark(); setFavoriteTag(v); }}
          />
          <Select
            size="xs" placeholder="Archetype" data={ARCHETYPES} value={archetype} clearable
            onChange={(v) => { mark(); setArchetype(v); }}
          />
          <TextInput
            size="xs" placeholder="Deck list URL"
            value={deckListUrl ?? ""}
            onChange={(e) => { mark(); setDeckListUrl(e.currentTarget.value || null); }}
          />
        </Stack>
      </Collapse>
    </Card>
  );
}
