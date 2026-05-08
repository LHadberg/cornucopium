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
  IconEraser,
  IconExternalLink,
  IconLayersIntersect,
  IconList,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { COLOR_COMBINATIONS, CommanderCardBody, ManaSymbol, ColorlessSymbol } from "~/app/_components/commander-card-body";
import { api } from "~/trpc/react";
import type { Deck } from "../../../../generated/prisma";

// ── Constants ─────────────────────────────────────────────────────────────────

const BRACKETS = [
  { value: "1", label: "1 — Exhibition" },
  { value: "2", label: "2 — Core" },
  { value: "3", label: "3 — Upgraded" },
  { value: "4", label: "4 — Optimized" },
  { value: "5", label: "5 — cEDH" },
];

const ARCHETYPES = [
  { value: "Aggro",    label: "Aggro" },
  { value: "Combo",    label: "Combo" },
  { value: "Control",  label: "Control" },
  { value: "Midrange", label: "Midrange" },
  { value: "Stax",     label: "Stax" },
  { value: "Tempo",    label: "Tempo" },
  { value: "Vorthos",  label: "Vorthos" },
];

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

const COLOR_ORDER = ["w", "u", "b", "r", "g"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch { return false; }
}

function colorIdToLetters(colorId: string | null): string[] {
  if (!colorId || colorId === "c") return [];
  const letters = colorId.split("").map((c) => c.toUpperCase()).filter((c) => ["W", "U", "B", "R", "G"].includes(c));
  return COLOR_ORDER.map((c) => c.toUpperCase()).filter((c) => letters.includes(c));
}

function colorSlotName(colorId: string | null): string | null {
  if (!colorId) return null;
  return COLOR_COMBINATIONS.find((c) => c.id === colorId)?.name ?? null;
}

interface ScryfallCard {
  id: string;
  name: string;
  type_line: string;
  color_identity?: string[];
  image_uris?: { normal: string; art_crop: string };
  card_faces?: { image_uris?: { normal: string; art_crop: string } }[];
}

function cardImage(card: ScryfallCard): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}
function cardArtCrop(card: ScryfallCard): string | null {
  return card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop ?? null;
}
function colorIdentityToColorId(identity: string[]): string | null {
  if (identity.length === 0) return "c";
  const lower = [...new Set(identity.map((c) => c.toLowerCase()))];
  return COLOR_ORDER.filter((c) => lower.includes(c)).join("") || "c";
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

// ── CardSearchCombobox ────────────────────────────────────────────────────────

interface CardSearchComboboxProps {
  placeholder: string;
  value: string;
  onSelect: (card: ScryfallCard) => void;
  onClear: () => void;
  searchQuery?: string;
}

function CardSearchCombobox({ placeholder, value, onSelect, onClear }: CardSearchComboboxProps) {
  const store = useCombobox({ onDropdownClose: () => store.resetSelectedOption() });
  const [query, setQuery] = useState(value);
  const [debounced] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (debounced.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    scryfallSearch(`is:commander ${debounced}`).then(setResults).finally(() => setLoading(false));
  }, [debounced]);

  return (
    <Combobox store={store} onOptionSubmit={(id) => {
      const card = results.find((c) => c.id === id) ?? null;
      if (card) { onSelect(card); setQuery(card.name); }
      store.closeDropdown();
    }}>
      <Combobox.Target>
        <InputBase
          size="xs" placeholder={placeholder} value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            if (!e.currentTarget.value) onClear();
            store.openDropdown();
          }}
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
                    <Image src={cardImage(card)!} alt={card.name} radius={20} loading="lazy"
                      style={{ width: "min(260px, calc(100vw - 16px))" }}
                    />
                  </HoverCard.Dropdown>
                )}
              </HoverCard>
            </Combobox.Option>
          )) : (
            <Combobox.Empty>
              <Text size="xs">{loading ? "Searching..." : query.length >= 2 ? "No results" : "Type to search"}</Text>
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

// ── TagSelector ───────────────────────────────────────────────────────────────

function TagSelector({ tags, setTags, favoriteTag, setFavoriteTag }: {
  tags: string[];
  setTags: (v: string[]) => void;
  favoriteTag: string | null;
  setFavoriteTag: (v: string | null) => void;
}) {
  return (
    <MultiSelect
      size="xs" placeholder="Tags" data={TAGS} value={tags}
      onChange={(next) => {
        setTags(next);
        if (favoriteTag && !next.includes(favoriteTag)) setFavoriteTag(null);
      }}
      searchable clearable maxDropdownHeight={200}
      renderOption={({ option, checked }) => (
        <Group justify="space-between" w="100%" wrap="nowrap">
          <Text size="xs">{option.label}</Text>
          {checked && (
            <ActionIcon size="xs" variant="subtle"
              color={favoriteTag === option.value ? "yellow" : "gray"}
              onClick={(e) => {
                e.stopPropagation();
                setFavoriteTag(favoriteTag === option.value ? null : option.value);
              }}
            >
              {favoriteTag === option.value ? <IconStarFilled size={11} /> : <IconStar size={11} />}
            </ActionIcon>
          )}
        </Group>
      )}
    />
  );
}

// ── DeckSlot ──────────────────────────────────────────────────────────────────

export function DeckSlot({ deck, onDelete }: { deck: Deck; onDelete: () => void }) {
  const utils = api.useUtils();
  const updateDeck = api.decks.update.useMutation({
    onSuccess: () => void utils.decks.getAll.invalidate(),
  });
  const upsertSelection = api.mtg.upsertSelection.useMutation();

  const [expanded, { open, close }] = useDisclosure(false);
  const [collapseVisible, setCollapseVisible] = useState(false);

  const clickedInsideCard = useRef(false);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!expanded) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (clickedInsideCard.current) { clickedInsideCard.current = false; return; }
      if ((e.target as Element | null)?.closest('.mantine-Popover-dropdown, .mantine-Modal-root')) return;
      closeRef.current();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [expanded]);

  const handleToggle = () => {
    if (!expanded) { setCollapseVisible(true); open(); }
    else close();
  };

  // ── Form state (initialised once from deck prop) ──────────────────────────

  const userModified = useRef(false);
  const mark = () => { userModified.current = true; };

  const [deckName, setDeckName] = useState(deck.name ?? "");
  const [hasPartner, setHasPartner] = useState(!!deck.partnerName);
  const [hasCompanion, setHasCompanion] = useState(!!deck.companionName);
  const [bracket, setBracket] = useState<string | null>(deck.bracket);
  const [tags, setTags] = useState<string[]>(() => {
    try { return JSON.parse(deck.tags) as string[]; } catch { return []; }
  });
  const [favoriteTag, setFavoriteTag] = useState<string | null>(deck.favoriteTag);
  const [archetype, setArchetype] = useState<string | null>(deck.archetype);
  const [deckListUrl, setDeckListUrl] = useState<string | null>(deck.deckListUrl);

  // Commander
  const [commanderQuery, setCommanderQuery] = useState(deck.commanderName ?? "");
  const [commander, setCommander] = useState<ScryfallCard | null>(
    deck.commanderName ? {
      id: deck.commanderScryfallId ?? "",
      name: deck.commanderName,
      type_line: deck.commanderTypeLine ?? "",
      color_identity: [],
      image_uris: deck.commanderImage && deck.commanderArtCrop
        ? { normal: deck.commanderImage, art_crop: deck.commanderArtCrop }
        : undefined,
    } : null,
  );

  // Partner
  const [partnerQuery, setPartnerQuery] = useState(deck.partnerName ?? "");
  const [partner, setPartner] = useState<ScryfallCard | null>(
    deck.partnerName ? {
      id: deck.partnerScryfallId ?? "",
      name: deck.partnerName,
      type_line: deck.partnerTypeLine ?? "",
      color_identity: [],
      image_uris: deck.partnerImage && deck.partnerArtCrop
        ? { normal: deck.partnerImage, art_crop: deck.partnerArtCrop }
        : undefined,
    } : null,
  );

  // Companion
  const [companionQuery, setCompanionQuery] = useState(deck.companionName ?? "");
  const [companion, setCompanion] = useState<ScryfallCard | null>(
    deck.companionName ? {
      id: deck.companionScryfallId ?? "",
      name: deck.companionName,
      type_line: deck.companionTypeLine ?? "",
      color_identity: [],
      image_uris: deck.companionImage && deck.companionArtCrop
        ? { normal: deck.companionImage, art_crop: deck.companionArtCrop }
        : undefined,
    } : null,
  );

  // ── Auto-save ─────────────────────────────────────────────────────────────

  const savePayload = JSON.stringify({
    id: deck.id,
    name: deckName || null,
    commanderScryfallId: commander?.id ?? null,
    commanderName: commander?.name ?? null,
    commanderTypeLine: commander?.type_line ?? null,
    commanderImage: commander ? cardImage(commander) : null,
    commanderArtCrop: commander ? cardArtCrop(commander) : null,
    partnerScryfallId: partner?.id ?? null,
    partnerName: partner?.name ?? null,
    partnerTypeLine: partner?.type_line ?? null,
    partnerImage: partner ? cardImage(partner) : null,
    partnerArtCrop: partner ? cardArtCrop(partner) : null,
    partnerType: deck.partnerType,
    companionScryfallId: companion?.id ?? null,
    companionName: companion?.name ?? null,
    companionTypeLine: companion?.type_line ?? null,
    companionImage: companion ? cardImage(companion) : null,
    companionArtCrop: companion ? cardArtCrop(companion) : null,
    bracket,
    tags,
    favoriteTag,
    archetype,
    deckListUrl,
    colorId: (() => {
      const allColors = [
        ...(commander?.color_identity ?? []),
        ...(partner?.color_identity ?? []),
      ];
      return allColors.length > 0 ? colorIdentityToColorId(allColors) : deck.colorId;
    })(),
  });

  const [debouncedSave] = useDebouncedValue(savePayload, 1000);

  useEffect(() => {
    if (!userModified.current) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    updateDeck.mutate(JSON.parse(debouncedSave));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSave]);

  // ── Derived display values ────────────────────────────────────────────────

  const displayName = deckName || commander?.name || deck.commanderName || "Unnamed";
  const colors = colorIdToLetters(deck.colorId);
  const isColorless = deck.colorId === "c";
  const bracketLabel = BRACKETS.find((b) => b.value === bracket)?.label ?? null;
  const displayTag = favoriteTag ?? tags[0] ?? null;
  const slotName = colorSlotName(deck.colorId);

  const img = commander ? cardImage(commander) : null;
  const art = commander ? cardArtCrop(commander) : null;
  const partnerImg = partner ? cardImage(partner) : null;
  const partnerArt = partner ? cardArtCrop(partner) : null;
  const companionImg = companion ? cardImage(companion) : null;
  const companionArt = companion ? cardArtCrop(companion) : null;

  // ── Set as MTG slot handler ───────────────────────────────────────────────

  const handleSetAsMtgSlot = () => {
    if (!deck.colorId) return;
    let parsedTags: string[] = [];
    try { parsedTags = JSON.parse(deck.tags) as string[]; } catch { parsedTags = []; }
    upsertSelection.mutate({
      colorId: deck.colorId,
      commanderScryfallId: deck.commanderScryfallId,
      commanderName: deck.commanderName,
      commanderTypeLine: deck.commanderTypeLine,
      commanderImage: deck.commanderImage,
      commanderArtCrop: deck.commanderArtCrop,
      partnerScryfallId: deck.partnerScryfallId,
      partnerName: deck.partnerName,
      partnerTypeLine: deck.partnerTypeLine,
      partnerImage: deck.partnerImage,
      partnerArtCrop: deck.partnerArtCrop,
      partnerType: deck.partnerType as "partner" | "partner-with" | "background" | null,
      companionScryfallId: deck.companionScryfallId,
      companionName: deck.companionName,
      companionTypeLine: deck.companionTypeLine,
      companionImage: deck.companionImage,
      companionArtCrop: deck.companionArtCrop,
      bracket: deck.bracket as "1" | "2" | "3" | "4" | "5" | null,
      tags: parsedTags as Parameters<typeof upsertSelection.mutate>[0]["tags"],
      favoriteTag: deck.favoriteTag as Parameters<typeof upsertSelection.mutate>[0]["favoriteTag"],
      archetype: deck.archetype as Parameters<typeof upsertSelection.mutate>[0]["archetype"],
      deckListUrl: deck.deckListUrl,
      commanderPreferredPrintId: null,
      commanderPreferredPrintImage: null,
      commanderPreferredPrintArt: null,
      commanderPreferredPrintBackImage: null,
      commanderPreferredPrintBackArt: null,
      partnerPreferredPrintId: null,
      partnerPreferredPrintImage: null,
      partnerPreferredPrintArt: null,
      partnerPreferredPrintBackImage: null,
      partnerPreferredPrintBackArt: null,
      companionPreferredPrintId: null,
      companionPreferredPrintImage: null,
      companionPreferredPrintArt: null,
      companionPreferredPrintBackImage: null,
      companionPreferredPrintBackArt: null,
    });
  };

  return (
    <Card withBorder padding="sm" onMouseDownCapture={() => { clickedInsideCard.current = true; }}>
      {/* ── Header ── */}
      <Group justify="space-between" wrap="nowrap" mb={collapseVisible ? "xs" : 0}>
        <Text size="xs" fw={700} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {displayName}
        </Text>
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {isColorless ? <ColorlessSymbol /> : colors.length === 0 ? null : colors.map((c) => <ManaSymbol key={c} color={c} />)}
          {isValidUrl(deckListUrl) && (
            <Tooltip label="Open deck list" withArrow position="top" openDelay={400}>
              <ActionIcon size="xs" variant="subtle" color="blue"
                component="a" href={deckListUrl!} target="_blank" rel="noopener noreferrer"
              >
                <IconList size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={expanded ? "Collapse" : "Edit"} withArrow position="top" openDelay={400}>
            <ActionIcon size="xs" variant="subtle" onClick={handleToggle}>
              {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* ── Contracted summary ── */}
      {!collapseVisible && (
        <CommanderCardBody
          commanderName={commander?.name ?? null}
          commanderArtCrop={art}
          commanderImage={img}
          partnerName={partner?.name ?? null}
          partnerLabel={deck.partnerType ? (deck.partnerType === "background" ? "Background" : deck.partnerType === "partner-with" ? "Partner with" : "Partner") : undefined}
          partnerArtCrop={partnerArt}
          partnerImage={partnerImg}
          companionName={companion?.name ?? null}
          companionArtCrop={companionArt}
          companionImage={companionImg}
          bracketLabel={bracketLabel}
          displayTag={displayTag}
          archetype={archetype}
          visual={true}
          tooltipSide="right"
          emptyText="No commander"
        />
      )}

      {/* ── Expanded edit form ── */}
      <Collapse in={expanded} onTransitionEnd={() => { if (!expanded) setCollapseVisible(false); }}>
        <Stack gap="xs">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="xs" c="dimmed" fw={500}>Commander</Text>
            <Popover position="bottom-end" withArrow shadow="sm" width={200} withinPortal>
              <Popover.Target>
                <ActionIcon size="xs" variant="subtle" aria-label="Options">
                  <IconDots size={14} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown p="xs">
                <Stack gap="xs">
                  {slotName && (
                    <Button
                      size="xs" variant="subtle" color="teal"
                      leftSection={<IconLayersIntersect size={12} />}
                      fullWidth justify="flex-start"
                      loading={upsertSelection.isPending}
                      disabled={!deck.commanderName}
                      onClick={handleSetAsMtgSlot}
                    >
                      Set as {slotName} deck
                    </Button>
                  )}
                  <Divider />
                  <Button
                    size="xs" variant="subtle" color="red"
                    leftSection={<IconTrash size={12} />}
                    fullWidth justify="flex-start"
                    onClick={onDelete}
                  >
                    Delete deck
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>

          <TextInput
            size="xs" placeholder="Deck name (optional)"
            value={deckName}
            onChange={(e) => { mark(); setDeckName(e.currentTarget.value); }}
          />

          <Group gap="xs" align="center">
            <Switch
              size="xs" label="Has partner" checked={hasPartner}
              onChange={(e) => {
                mark();
                setHasPartner(e.currentTarget.checked);
                if (!e.currentTarget.checked) { setPartner(null); setPartnerQuery(""); }
              }}
            />
            <Switch
              size="xs" label="Has companion" checked={hasCompanion}
              onChange={(e) => {
                mark();
                setHasCompanion(e.currentTarget.checked);
                if (!e.currentTarget.checked) { setCompanion(null); setCompanionQuery(""); }
              }}
            />
          </Group>

          <Text size="xs" c="dimmed" fw={500}>Commander</Text>
          <CardSearchCombobox
            placeholder="Search commander..."
            value={commanderQuery}
            onSelect={(card) => { mark(); setCommander(card); setCommanderQuery(card.name); }}
            onClear={() => { mark(); setCommander(null); setCommanderQuery(""); }}
          />

          {hasPartner && (
            <>
              <Text size="xs" c="dimmed" fw={500}>Partner</Text>
              <CardSearchCombobox
                placeholder="Search partner..."
                value={partnerQuery}
                onSelect={(card) => { mark(); setPartner(card); setPartnerQuery(card.name); }}
                onClear={() => { mark(); setPartner(null); setPartnerQuery(""); }}
              />
            </>
          )}

          {hasCompanion && (
            <>
              <Text size="xs" c="dimmed" fw={500}>Companion</Text>
              <CardSearchCombobox
                placeholder="Search companion..."
                value={companionQuery}
                onSelect={(card) => { mark(); setCompanion(card); setCompanionQuery(card.name); }}
                onClear={() => { mark(); setCompanion(null); setCompanionQuery(""); }}
              />
            </>
          )}

          <Select
            size="xs" placeholder="Bracket" data={BRACKETS}
            value={bracket} onChange={(v) => { mark(); setBracket(v); }} clearable
          />

          <TagSelector
            tags={tags} setTags={(v) => { mark(); setTags(v); }}
            favoriteTag={favoriteTag} setFavoriteTag={(v) => { mark(); setFavoriteTag(v); }}
          />

          <Select
            size="xs" placeholder="Archetype" data={ARCHETYPES}
            value={archetype} onChange={(v) => { mark(); setArchetype(v); }} clearable
          />

          <Group gap="xs" wrap="nowrap">
            <TextInput
              size="xs" placeholder="Deck list URL"
              value={deckListUrl ?? ""}
              onChange={(e) => { mark(); setDeckListUrl(e.currentTarget.value || null); }}
              style={{ flex: 1 }}
            />
            <Tooltip label="Open deck list" withArrow position="top">
              <ActionIcon
                size="sm" variant="subtle" color="blue"
                component="a" href={deckListUrl ?? "https://moxfield.com/decks"} target="_blank" rel="noopener noreferrer"
              >
                <IconExternalLink size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Collapse>
    </Card>
  );
}
