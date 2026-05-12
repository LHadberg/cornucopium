"use client";

import {
  Button,
  Collapse,
  Combobox,
  Divider,
  Group,
  HoverCard,
  Image,
  InputBase,
  Loader,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure, useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { DeckCard } from "./deck-card";
import { SelectionCharts } from "../../mtg-complete/_components/selection-charts";
import "../../mtg-complete/_i18n/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScryfallCard {
  id: string;
  name: string;
  type_line: string;
  color_identity?: string[];
  image_uris?: { normal: string; art_crop: string };
  card_faces?: { image_uris?: { normal: string; art_crop: string } }[];
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTooltipSide(slotIndex: number, numCols: number): "left" | "right" | "bottom" {
  if (numCols <= 1) return "bottom";
  const colIndex = slotIndex % numCols;
  const third = numCols / 3;
  if (colIndex < third) return "right";
  if (colIndex >= numCols - third) return "left";
  return "bottom";
}

function cardImage(card: ScryfallCard): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

function cardArtCrop(card: ScryfallCard): string | null {
  return card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop ?? null;
}

function colorIdentityToColorId(identity: string[]): string | null {
  if (identity.length === 0) return "c";
  const ORDER = ["w", "u", "b", "r", "g"];
  const lower = [...new Set(identity.map((c) => c.toLowerCase()))];
  return ORDER.filter((c) => lower.includes(c)).join("") || "c";
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
  tooltipSide?: "left" | "right" | "bottom";
}

function CardSearchCombobox({ placeholder, value, onSelect, onClear, tooltipSide = "right" }: CardSearchComboboxProps) {
  const store = useCombobox({ onDropdownClose: () => store.resetSelectedOption() });
  const [query, setQuery] = useState(value);
  const [debounced] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (debounced.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    scryfallSearch(`is:commander ${debounced}`)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <Combobox
      store={store}
      onOptionSubmit={(id) => {
        const card = results.find((c) => c.id === id) ?? null;
        if (card) { onSelect(card); setQuery(card.name); }
        store.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          size="xs" placeholder={placeholder} value={query}
          onChange={(e) => { setQuery(e.currentTarget.value); if (!e.currentTarget.value) onClear(); store.openDropdown(); }}
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
              <HoverCard width="auto" position={tooltipSide} openDelay={200} closeDelay={0} withinPortal middlewares={{ flip: true, shift: true }}>
                <HoverCard.Target>
                  <div>
                    <Text size="xs" fw={500}>{card.name}</Text>
                    <Text size="xs" c="dimmed">{card.type_line}</Text>
                  </div>
                </HoverCard.Target>
                {cardImage(card) && (
                  <HoverCard.Dropdown p={4}>
                    <Image src={cardImage(card)!} alt={card.name} radius={20} loading="lazy" style={{ maxWidth: "min(260px, calc(100vw - 16px))", width: "100%" }} />
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

// ── DeckForm (add + edit) ─────────────────────────────────────────────────────

function AddDeckForm({ onSuccess, tooltipSide = "right" }: { onSuccess: () => void; tooltipSide?: "left" | "right" | "bottom" }) {
  const utils = api.useUtils();
  const createDeck = api.decks.create.useMutation({
    onSuccess: () => { void utils.decks.getAll.invalidate(); onSuccess(); },
  });

  const [deckName, setDeckName] = useState("");
  const [hasPartner, setHasPartner] = useState(false);
  const [hasCompanion, setHasCompanion] = useState(false);
  const [bracket, setBracket] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [favoriteTag, setFavoriteTag] = useState<string | null>(null);
  const [archetype, setArchetype] = useState<string | null>(null);
  const [deckListUrl, setDeckListUrl] = useState("");

  const [commander, setCommander] = useState<ScryfallCard | null>(null);
  const [commanderQuery, setCommanderQuery] = useState("");
  const [partner, setPartner] = useState<ScryfallCard | null>(null);
  const [partnerQuery, setPartnerQuery] = useState("");
  const [companion, setCompanion] = useState<ScryfallCard | null>(null);
  const [companionQuery, setCompanionQuery] = useState("");

  const handleReset = () => {
    setDeckName(""); setHasPartner(false); setHasCompanion(false);
    setBracket(null); setTags([]); setFavoriteTag(null); setArchetype(null); setDeckListUrl("");
    setCommander(null); setCommanderQuery("");
    setPartner(null); setPartnerQuery("");
    setCompanion(null); setCompanionQuery("");
  };

  const handleSubmit = () => {
    const allColors = [...(commander?.color_identity ?? []), ...(partner?.color_identity ?? [])];
    const colorId = colorIdentityToColorId(allColors);
    createDeck.mutate({
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
      partnerType: null,
      companionScryfallId: companion?.id ?? null,
      companionName: companion?.name ?? null,
      companionTypeLine: companion?.type_line ?? null,
      companionImage: companion ? cardImage(companion) : null,
      companionArtCrop: companion ? cardArtCrop(companion) : null,
      bracket: (bracket as "1" | "2" | "3" | "4" | "5" | null) ?? null,
      tags: tags as Parameters<typeof createDeck.mutate>[0]["tags"],
      favoriteTag: (favoriteTag as Parameters<typeof createDeck.mutate>[0]["favoriteTag"]) ?? null,
      archetype: (archetype as Parameters<typeof createDeck.mutate>[0]["archetype"]) ?? null,
      deckListUrl: deckListUrl || null,
      colorId,
    });
  };

  return (
    <Stack gap="xs">
      <TextInput size="xs" placeholder="Deck name (optional)" value={deckName} onChange={(e) => setDeckName(e.currentTarget.value)} />

      <Group gap="xs" align="center">
        <Switch size="xs" label="Has partner" checked={hasPartner}
          onChange={(e) => { setHasPartner(e.currentTarget.checked); if (!e.currentTarget.checked) { setPartner(null); setPartnerQuery(""); } }}
        />
        <Switch size="xs" label="Has companion" checked={hasCompanion}
          onChange={(e) => { setHasCompanion(e.currentTarget.checked); if (!e.currentTarget.checked) { setCompanion(null); setCompanionQuery(""); } }}
        />
      </Group>

      <Text size="xs" c="dimmed" fw={500}>Commander</Text>
      <CardSearchCombobox placeholder="Search commander..." value={commanderQuery} tooltipSide={tooltipSide}
        onSelect={(card) => { setCommander(card); setCommanderQuery(card.name); }}
        onClear={() => { setCommander(null); setCommanderQuery(""); }}
      />

      {hasPartner && (
        <>
          <Text size="xs" c="dimmed" fw={500}>Partner</Text>
          <CardSearchCombobox placeholder="Search partner..." value={partnerQuery} tooltipSide={tooltipSide}
            onSelect={(card) => { setPartner(card); setPartnerQuery(card.name); }}
            onClear={() => { setPartner(null); setPartnerQuery(""); }}
          />
        </>
      )}

      {hasCompanion && (
        <>
          <Text size="xs" c="dimmed" fw={500}>Companion</Text>
          <CardSearchCombobox placeholder="Search companion..." value={companionQuery} tooltipSide={tooltipSide}
            onSelect={(card) => { setCompanion(card); setCompanionQuery(card.name); }}
            onClear={() => { setCompanion(null); setCompanionQuery(""); }}
          />
        </>
      )}

      <Select size="xs" placeholder="Bracket" data={BRACKETS} value={bracket} onChange={setBracket} clearable />
      <MultiSelect size="xs" placeholder="Tags" data={TAGS} value={tags}
        onChange={(next) => { setTags(next); if (favoriteTag && !next.includes(favoriteTag)) setFavoriteTag(null); }}
        searchable clearable maxDropdownHeight={200}
      />
      {tags.length > 0 && <Select size="xs" placeholder="Favorite tag" data={tags} value={favoriteTag} onChange={setFavoriteTag} clearable />}
      <Select size="xs" placeholder="Archetype" data={ARCHETYPES} value={archetype} onChange={setArchetype} clearable />
      <TextInput size="xs" placeholder="Deck list URL (e.g. moxfield.com/...)" value={deckListUrl} onChange={(e) => setDeckListUrl(e.currentTarget.value)} />

      <Group gap="xs">
        <Button size="xs" loading={createDeck.isPending} onClick={handleSubmit} disabled={!commander}>Add deck</Button>
        <Button size="xs" variant="subtle" color="gray" onClick={handleReset}>Reset</Button>
      </Group>
      {createDeck.isError && <Text size="xs" c="red">Failed to add deck. Please check your inputs.</Text>}
    </Stack>
  );
}

// ── Deck sorting ─────────────────────────────────────────────────────────────

type SortKey = "createdAt-desc" | "createdAt-asc" | "name-asc" | "name-desc" | "color" | "bracket" | "archetype";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "createdAt-desc", label: "Newest first" },
  { value: "createdAt-asc",  label: "Oldest first" },
  { value: "name-asc",       label: "Name (A → Z)" },
  { value: "name-desc",      label: "Name (Z → A)" },
  { value: "color",          label: "Color" },
  { value: "bracket",        label: "Bracket" },
  { value: "archetype",      label: "Archetype" },
];

const COLOR_ORDER = [
  "w","u","b","r","g",
  "wu","wb","wr","wg","ub","ur","ug","br","bg","rg",
  "wub","wur","wug","wbr","wbg","wrg","ubr","ubg","urg","brg",
  "wubr","wubg","wurg","wbrg","ubrg","wubrg","c",
];

function sortDecks(decks: DeckRow[], key: SortKey): DeckRow[] {
  return [...decks].sort((a, b) => {
    switch (key) {
      case "createdAt-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "createdAt-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name-asc":
        return (a.name ?? a.commanderName ?? "").localeCompare(b.name ?? b.commanderName ?? "");
      case "name-desc":
        return (b.name ?? b.commanderName ?? "").localeCompare(a.name ?? a.commanderName ?? "");
      case "color": {
        const ai = COLOR_ORDER.indexOf(a.colorId ?? "");
        const bi = COLOR_ORDER.indexOf(b.colorId ?? "");
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      case "bracket":
        return (a.bracket ?? "").localeCompare(b.bracket ?? "");
      case "archetype":
        return (a.archetype ?? "").localeCompare(b.archetype ?? "");
    }
  });
}

// ── DecksClient ───────────────────────────────────────────────────────────────

export function DecksClient() {
  const [addFormOpen, { toggle: toggleAddForm, close: closeAddForm }] = useDisclosure(false);

  const isXs = useMediaQuery("(min-width: 576px)") ?? false;
  const isSm = useMediaQuery("(min-width: 768px)") ?? false;
  const isMd = useMediaQuery("(min-width: 992px)") ?? false;
  const isLg = useMediaQuery("(min-width: 1200px)") ?? false;
  const numCols = isLg ? 5 : isMd ? 4 : isSm ? 3 : isXs ? 2 : 1;

  const [sortKey, setSortKey] = useLocalStorage<SortKey>({
    key: "decks-sort-key",
    defaultValue: "createdAt-desc",
  });

  const { data: decks = [], isLoading } = api.decks.getAll.useQuery();
  const utils = api.useUtils();
  const deleteDeck = api.decks.delete.useMutation({
    onSuccess: () => void utils.decks.getAll.invalidate(),
  });

  const sortedDecks = useMemo(() => sortDecks(decks, sortKey), [decks, sortKey]);

  return (
    <Stack gap="md">
      <Title order={3}>All Decks</Title>

      <SelectionCharts selections={decks} />

      <Group gap="xs" align="center">
        <Select
          size="xs"
          w={150}
          value={sortKey}
          onChange={(v) => v && setSortKey(v as SortKey)}
          data={SORT_OPTIONS}
          allowDeselect={false}
        />
        <Button size="xs" variant="light" onClick={toggleAddForm}>
          {addFormOpen ? "Cancel" : "Add new deck"}
        </Button>
      </Group>

      <Collapse in={addFormOpen}>
        <Stack gap="xs" p="sm" style={{ border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-sm)" }}>
          <Text size="sm" fw={600}>New Deck</Text>
          <Divider />
          <AddDeckForm onSuccess={closeAddForm} tooltipSide={getTooltipSide(0, numCols)} />
        </Stack>
      </Collapse>

      {isLoading ? (
        <Text size="sm" c="dimmed">Loading decks...</Text>
      ) : decks.length === 0 ? (
        <Text size="sm" c="dimmed">No decks yet. Add your first deck above!</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
          {sortedDecks.map((deck, index) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onDelete={() => deleteDeck.mutate({ id: deck.id })}
              tooltipSide={getTooltipSide(index, numCols)}
            />
          ))}
        </SimpleGrid>
      )}

    </Stack>
  );
}
