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
  Modal,
  MultiSelect,
  Popover,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure, useIntersection } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconDots,
  IconDownload,
  IconEraser,
  IconExternalLink,
  IconLayersIntersect,
  IconList,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { ArtImage, CommanderCardBody, GlimmerSvg, ManaSymbol } from "~/app/_components/commander-card-body";
import type { Deck } from "../../../../generated/prisma";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "~/trpc/react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ScryfallCard {
  id: string;
  name: string;
  type_line: string;
  mana_cost: string;
  layout?: string;
  oracle_text?: string;
  image_uris?: { normal: string; art_crop: string };
  card_faces?: { oracle_text?: string; image_uris?: { normal: string; art_crop: string } }[];
}

interface ScryfallPrint {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  image_uris?: { normal: string; art_crop: string };
  card_faces?: { image_uris?: { normal: string; art_crop: string } }[];
}

async function fetchPrints(cardName: string): Promise<ScryfallPrint[]> {
  const q = `!"${cardName}"`;
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints&order=released`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { data: ScryfallPrint[] };
  return data.data;
}

type PartnerType = "partner" | "partner-with" | "background" | null;

export interface SelectionData {
  commanderScryfallId: string | null;
  commanderName: string | null;
  commanderTypeLine: string | null;
  commanderImage: string | null;
  commanderArtCrop: string | null;
  partnerScryfallId: string | null;
  partnerName: string | null;
  partnerTypeLine: string | null;
  partnerImage: string | null;
  partnerArtCrop: string | null;
  partnerType: string | null;
  bracket: string | null;
  tags: string;
  favoriteTag: string | null;
  archetype: string | null;
  deckListUrl: string | null;
  commanderPreferredPrintId: string | null;
  commanderPreferredPrintImage: string | null;
  commanderPreferredPrintArt: string | null;
  commanderPreferredPrintBackImage: string | null;
  commanderPreferredPrintBackArt: string | null;
  partnerPreferredPrintId: string | null;
  partnerPreferredPrintImage: string | null;
  partnerPreferredPrintArt: string | null;
  partnerPreferredPrintBackImage: string | null;
  partnerPreferredPrintBackArt: string | null;
  companionScryfallId: string | null;
  companionName: string | null;
  companionTypeLine: string | null;
  companionImage: string | null;
  companionArtCrop: string | null;
  companionPreferredPrintId: string | null;
  companionPreferredPrintImage: string | null;
  companionPreferredPrintArt: string | null;
  companionPreferredPrintBackImage: string | null;
  companionPreferredPrintBackArt: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BRACKETS = [
  { value: "1", label: "1 — Exhibition" },
  { value: "2", label: "2 — Core" },
  { value: "3", label: "3 — Upgraded" },
  { value: "4", label: "4 — Optimized" },
  { value: "5", label: "5 — cEDH" },
];

const ARCHETYPES: { value: string; label: string }[] = [
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function cardImage(card: ScryfallCard) {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

function cardArtCrop(card: ScryfallCard) {
  return card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop ?? null;
}

function getOracleText(card: ScryfallCard) {
  return card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? "";
}

function isValidUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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
  return match ? match[1]!.trim() : null;
}

async function scryfallSearch(q: string): Promise<ScryfallCard[]> {
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=name&unique=cards`,
    { headers: { "User-Agent": "Cornucopium/1.0", "Accept": "application/json" } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { data: ScryfallCard[] };
  return data.data.slice(0, 10);
}

async function searchCommanders(colorId: string, query: string) {
  if (query.trim().length < 2) return [];
  return scryfallSearch(`is:commander id<=${colorId} ${query}`);
}

async function searchPartners(query: string) {
  if (query.trim().length < 2) return [];
  return scryfallSearch(`is:commander oracle:Partner ${query}`);
}

async function searchBackgrounds(query: string) {
  if (query.trim().length < 2) return [];
  return scryfallSearch(`t:background ${query}`);
}

async function searchByExactName(name: string) {
  return scryfallSearch(`!"${name}"`);
}

async function searchAnyCard(query: string) {
  if (query.trim().length < 2) return [];
  return scryfallSearch(query);
}

async function searchCompanions(colorId: string, query: string) {
  if (query.trim().length < 2) return [];
  return scryfallSearch(`keyword:companion t:creature id<=${colorId} ${query}`);
}

async function searchCompanionsRule0(query: string) {
  if (query.trim().length < 2) return [];
  return scryfallSearch(`keyword:companion t:creature ${query}`);
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CardSearchProps {
  placeholder: string;
  query: string;
  results: ScryfallCard[];
  loading: boolean;
  store: ReturnType<typeof useCombobox>;
  onQueryChange: (q: string) => void;
  onSelect: (card: ScryfallCard | null) => void;
  tooltipSide?: "left" | "right" | "bottom";
}

function CardSearch({ placeholder, query, results, loading, store, onQueryChange, onSelect, tooltipSide = "right" }: CardSearchProps) {
  const { t } = useTranslation();
  return (
    <Combobox store={store} onOptionSubmit={(id) => {
      const card = results.find((c) => c.id === id) ?? null;
      onSelect(card);
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
              <Text size="xs">
                {loading ? t('mtg.selector.searching') : query.length >= 2 ? t('mtg.selector.noResults') : t('mtg.selector.typeToSearch')}
              </Text>
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
  const { t } = useTranslation();
  return (
    <MultiSelect
      size="xs" placeholder={t('mtg.selector.tagsPlaceholder')} data={TAGS} value={tags}
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


// Print version picker modal
interface PrintPickerModalProps {
  opened: boolean;
  onClose: () => void;
  cardName: string;
  currentPrintId: string | null;
  onSelect: (id: string, image: string, artCrop: string, backImage: string | null, backArtCrop: string | null) => void;
  onClear: () => void;
}

function PrintPickerModal({ opened, onClose, cardName, currentPrintId, onSelect, onClear }: PrintPickerModalProps) {
  const { t } = useTranslation();
  const [prints, setPrints] = useState<ScryfallPrint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened || !cardName) return;
    setLoading(true);
    setPrints([]);
    fetchPrints(cardName).then(setPrints).finally(() => setLoading(false));
  }, [opened, cardName]);

  return (
    <Modal opened={opened} onClose={onClose} title={t('mtg.selector.artVersions', { cardName })} size="xl" centered>
      {loading ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : (
        <Stack gap="sm">
          <ScrollArea h={700}>
            <SimpleGrid cols={2} spacing="sm">
              {prints.map((print) => {
                const pImg = print.image_uris?.normal ?? print.card_faces?.[0]?.image_uris?.normal;
                const pArt = print.image_uris?.art_crop ?? print.card_faces?.[0]?.image_uris?.art_crop;
                if (!pImg || !pArt) return null;
                const selected = print.id === currentPrintId;
                return (
                  <div
                    key={print.id}
                    onClick={() => {
                      const backImg = print.card_faces?.[1]?.image_uris?.normal ?? null;
                      const backArt = print.card_faces?.[1]?.image_uris?.art_crop ?? null;
                      onSelect(print.id, pImg, pArt, backImg, backArt);
                      onClose();
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 6,
                      border: selected ? "2px solid #FFD700" : "2px solid transparent",
                      overflow: "hidden",
                    }}
                  >
                    <Image src={pImg} alt={`${print.set_name} #${print.collector_number}`} radius={20} loading="lazy" />
                    <Text size="xs" ta="center" px={4} py={2} lineClamp={1}>
                      {print.set_name} #{print.collector_number}
                    </Text>
                  </div>
                );
              })}
            </SimpleGrid>
          </ScrollArea>
          {currentPrintId && (
            <Group justify="flex-end">
              <Button size="xs" variant="subtle" color="gray" onClick={() => { onClear(); onClose(); }}>
                {t('mtg.selector.useDefaultArt')}
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface SlotSnapshot {
  commanderScryfallId: string | null;
  bracket: string | null;
  tags: string[];
  archetype: string | null;
}

export interface CommanderSlotProps {
  colorId: string;
  name: string;
  colors: string[];
  visual?: boolean;
  initialData?: SelectionData;
  canSave?: boolean;
  isLoading?: boolean;
  readOnly?: boolean;
  tooltipSide?: "left" | "right" | "bottom";
  onLocalChange?: (colorId: string, snapshot: SlotSnapshot) => void;
}

export function CommanderSlot({
  colorId, name, colors, visual = false, initialData, canSave = false, isLoading = false, readOnly = false,
  tooltipSide = "right",
  onLocalChange,
}: CommanderSlotProps) {
  const { t } = useTranslation();
  const [expanded, { open, close }] = useDisclosure(false);
  const [collapseVisible, setCollapseVisible] = useState(false);

  // Track whether a mousedown started inside the card (capture fires before document bubble)
  const clickedInsideCard = useRef(false);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!expanded) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (clickedInsideCard.current) {
        clickedInsideCard.current = false;
        return;
      }
      // Ignore Mantine portaled dropdowns and modals
      if ((e.target as Element | null)?.closest('.mantine-Popover-dropdown, .mantine-Modal-root')) return;
      closeRef.current();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [expanded]);

  const handleToggle = () => {
    if (!expanded) {
      setCollapseVisible(true);
      open();
    } else {
      close();
      // collapseVisible stays true until the Collapse animation finishes
    }
  };

  // Commander
  const cmdStore = useCombobox({ onDropdownClose: () => cmdStore.resetSelectedOption() });
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [commander, setCommander] = useState<ScryfallCard | null>(null);

  // Partner
  const ptnStore = useCombobox({ onDropdownClose: () => ptnStore.resetSelectedOption() });
  const [partnerQuery, setPartnerQuery] = useState("");
  const [debouncedPartner] = useDebouncedValue(partnerQuery, 300);
  const [partnerResults, setPartnerResults] = useState<ScryfallCard[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partner, setPartner] = useState<ScryfallCard | null>(null);
  // Persisted partner type (used when oracle_text unavailable after hydration)
  const [savedPartnerType, setSavedPartnerType] = useState<PartnerType>(null);

  // Other
  const [bracket, setBracket] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [favoriteTag, setFavoriteTag] = useState<string | null>(null);
  const [archetype, setArchetype] = useState<string | null>(null);
  const [deckListUrl, setDeckListUrl] = useState<string | null>(null);

  type PreferredPrint = { id: string; image: string; artCrop: string; backImage: string | null; backArtCrop: string | null } | null;
  // Preferred print overrides (id + image URLs for commander / partner)
  const [cmdPreferredPrint, setCmdPreferredPrint] = useState<PreferredPrint>(null);
  const [ptnPreferredPrint, setPtnPreferredPrint] = useState<PreferredPrint>(null);
  // null = closed, 'commander' | 'partner' | 'companion' = open for that card
  const [printPickerFor, setPrintPickerFor] = useState<"commander" | "partner" | "companion" | null>(null);

  // Rule 0 toggles
  const [allowRule0, setAllowRule0] = useState(false);

  // Companion
  const cmpStore = useCombobox({ onDropdownClose: () => cmpStore.resetSelectedOption() });
  const [hasCompanion, setHasCompanion] = useState(false);
  const [companion, setCompanion] = useState<ScryfallCard | null>(null);
  const [companionQuery, setCompanionQuery] = useState("");
  const [debouncedCompanion] = useDebouncedValue(companionQuery, 300);
  const [companionResults, setCompanionResults] = useState<ScryfallCard[]>([]);
  const [companionLoading, setCompanionLoading] = useState(false);
  const [companionPreferredPrint, setCompanionPreferredPrint] = useState<PreferredPrint>(null);

  const userModified = useRef(false);
  const hasHydrated = useRef(false);
  const enrichedCmdId = useRef<string | null>(null);
  const enrichedPtnId = useRef<string | null>(null);
  const enrichedCmpId = useRef<string | null>(null);

  const { ref: cardRef, entry } = useIntersection({ threshold: 0, rootMargin: "200px" });
  const isInView = entry?.isIntersecting ?? false;

  // Derive effective partner type from oracle text or saved value
  const partnerType: PartnerType = commander
    ? (getPartnerType(commander) || savedPartnerType)
    : null;
  const partnerWithName = partnerType === "partner-with" ? getPartnerWithName(commander!) : null;
  const partnerLabel =
    partnerType === "background" ? "Background" :
      partnerType === "partner-with" ? "Partner with" :
        partnerType === "partner" ? "Partner" : null;

  // Hydrate from DB
  useEffect(() => {
    if (hasHydrated.current || !initialData) return;
    hasHydrated.current = true;

    if (initialData.commanderName) {
      setQuery(initialData.commanderName);
      setCommander({
        id: initialData.commanderScryfallId ?? "",
        name: initialData.commanderName,
        type_line: initialData.commanderTypeLine ?? "",
        mana_cost: "",
        image_uris: (initialData.commanderImage && initialData.commanderArtCrop)
          ? { normal: initialData.commanderImage, art_crop: initialData.commanderArtCrop }
          : undefined,
      });
    }
    if (initialData.partnerType) {
      setSavedPartnerType(initialData.partnerType as PartnerType);
    }
    if (initialData.partnerName) {
      setPartnerQuery(initialData.partnerName);
      setPartner({
        id: initialData.partnerScryfallId ?? "",
        name: initialData.partnerName,
        type_line: initialData.partnerTypeLine ?? "",
        mana_cost: "",
        image_uris: (initialData.partnerImage && initialData.partnerArtCrop)
          ? { normal: initialData.partnerImage, art_crop: initialData.partnerArtCrop }
          : undefined,
      });
    }
    setBracket(initialData.bracket);
    try { setTags(JSON.parse(initialData.tags) as string[]); } catch { setTags([]); }
    setFavoriteTag(initialData.favoriteTag);
    setArchetype(initialData.archetype);
    setDeckListUrl(initialData.deckListUrl);
    if (initialData.commanderPreferredPrintId && initialData.commanderPreferredPrintImage && initialData.commanderPreferredPrintArt) {
      setCmdPreferredPrint({ id: initialData.commanderPreferredPrintId, image: initialData.commanderPreferredPrintImage, artCrop: initialData.commanderPreferredPrintArt, backImage: initialData.commanderPreferredPrintBackImage, backArtCrop: initialData.commanderPreferredPrintBackArt });
    }
    if (initialData.partnerPreferredPrintId && initialData.partnerPreferredPrintImage && initialData.partnerPreferredPrintArt) {
      setPtnPreferredPrint({ id: initialData.partnerPreferredPrintId, image: initialData.partnerPreferredPrintImage, artCrop: initialData.partnerPreferredPrintArt, backImage: initialData.partnerPreferredPrintBackImage, backArtCrop: initialData.partnerPreferredPrintBackArt });
    }
    if (initialData.companionName) {
      setHasCompanion(true);
      setCompanionQuery(initialData.companionName);
      setCompanion({
        id: initialData.companionScryfallId ?? "",
        name: initialData.companionName,
        type_line: initialData.companionTypeLine ?? "",
        mana_cost: "",
        image_uris: (initialData.companionImage && initialData.companionArtCrop)
          ? { normal: initialData.companionImage, art_crop: initialData.companionArtCrop }
          : undefined,
      });
    }
    if (initialData.companionPreferredPrintId && initialData.companionPreferredPrintImage && initialData.companionPreferredPrintArt) {
      setCompanionPreferredPrint({ id: initialData.companionPreferredPrintId, image: initialData.companionPreferredPrintImage, artCrop: initialData.companionPreferredPrintArt, backImage: initialData.companionPreferredPrintBackImage, backArtCrop: initialData.companionPreferredPrintBackArt });
    }
  }, [initialData]);

  // Enrich commander with card_faces / layout if missing (e.g. after hydration from DB)
  useEffect(() => {
    if (!isInView) return;
    if (!commander?.id || (commander.card_faces !== undefined && commander.layout !== undefined)) return;
    if (enrichedCmdId.current === commander.id) return;
    enrichedCmdId.current = commander.id;
    fetch(`https://api.scryfall.com/cards/${commander.id}`)
      .then((r) => r.ok ? r.json() as Promise<ScryfallCard> : null)
      .then((data) => {
        if (data) {
          setCommander((prev) => prev ? {
            ...prev,
            ...(data.card_faces !== undefined && { card_faces: data.card_faces }),
            layout: data.layout,
          } : prev);
        }
      })
      .catch(() => undefined);
  }, [commander?.id, isInView]);

  // Enrich partner with card_faces / layout if missing
  useEffect(() => {
    if (!isInView) return;
    if (!partner?.id || (partner.card_faces !== undefined && partner.layout !== undefined)) return;
    if (enrichedPtnId.current === partner.id) return;
    enrichedPtnId.current = partner.id;
    fetch(`https://api.scryfall.com/cards/${partner.id}`)
      .then((r) => r.ok ? r.json() as Promise<ScryfallCard> : null)
      .then((data) => {
        if (data) {
          setPartner((prev) => prev ? {
            ...prev,
            ...(data.card_faces !== undefined && { card_faces: data.card_faces }),
            layout: data.layout,
          } : prev);
        }
      })
      .catch(() => undefined);
  }, [partner?.id, isInView]);

  // Enrich companion with card_faces / layout if missing
  useEffect(() => {
    if (!isInView) return;
    if (!companion?.id || (companion.card_faces !== undefined && companion.layout !== undefined)) return;
    if (enrichedCmpId.current === companion.id) return;
    enrichedCmpId.current = companion.id;
    fetch(`https://api.scryfall.com/cards/${companion.id}`)
      .then((r) => r.ok ? r.json() as Promise<ScryfallCard> : null)
      .then((data) => {
        if (data) {
          setCompanion((prev) => prev ? {
            ...prev,
            ...(data.card_faces !== undefined && { card_faces: data.card_faces }),
            layout: data.layout,
          } : prev);
        }
      })
      .catch(() => undefined);
  }, [companion?.id, isInView]);

  // Commander search
  useEffect(() => {
    if (!userModified.current) return;
    if (debounced.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const fn = allowRule0 ? searchAnyCard : () => searchCommanders(colorId, debounced);
    fn(debounced).then(setResults).finally(() => setLoading(false));
  }, [colorId, debounced, allowRule0]);

  // Reset / auto-resolve partner when commander changes
  useEffect(() => {
    // Skip during hydration — partner is already set from DB, and partnerType may not yet be
    // derivable (oracle_text absent on hydrated card) so we'd incorrectly clear it.
    if (!userModified.current) return;
    if (!commander || !partnerType) {
      setPartner(null); setPartnerQuery(""); setPartnerResults([]); setSavedPartnerType(null); setPtnPreferredPrint(null);
      return;
    }
    if (partnerType === "partner-with" && partnerWithName) {
      setPartnerLoading(true);
      searchByExactName(partnerWithName)
        .then((res) => {
          const card = res[0] ?? null;
          setPartner(card);
          setPartnerQuery(card?.name ?? partnerWithName);
        })
        .finally(() => setPartnerLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commander?.id]);

  // Partner search (plain partner / background)
  useEffect(() => {
    if (!userModified.current) return;
    if (partnerType !== "partner" && partnerType !== "background") { setPartnerResults([]); return; }
    if (debouncedPartner.trim().length < 2) { setPartnerResults([]); return; }
    setPartnerLoading(true);
    const fn = partnerType === "background" ? searchBackgrounds : searchPartners;
    fn(debouncedPartner).then(setPartnerResults).finally(() => setPartnerLoading(false));
  }, [debouncedPartner, partnerType]);

  // Companion search
  useEffect(() => {
    if (!userModified.current) return;
    if (!hasCompanion) { setCompanionResults([]); return; }
    if (debouncedCompanion.trim().length < 2) { setCompanionResults([]); return; }
    setCompanionLoading(true);
    const fn = allowRule0 ? searchCompanionsRule0 : () => searchCompanions(colorId, debouncedCompanion);
    fn(debouncedCompanion).then(setCompanionResults).finally(() => setCompanionLoading(false));
  }, [colorId, debouncedCompanion, hasCompanion, allowRule0]);

  // Notify parent of local state changes for reactive chart updates
  useEffect(() => {
    if (!hasHydrated.current && !commander) return;
    onLocalChange?.(colorId, {
      commanderScryfallId: commander?.id ?? null,
      bracket,
      tags,
      archetype,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commander?.id, bracket, tags, archetype]);

  // Persist
  const utils = api.useUtils();
  const { mutate: upsert } = api.mtg.upsertSelection.useMutation({
    onSuccess: () => void utils.mtg.getSelections.invalidate(),
  });
  const saveJson = JSON.stringify({
    colorId,
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
    partnerType: partnerType ?? null,
    bracket, tags, favoriteTag, archetype, deckListUrl,
    commanderPreferredPrintId: cmdPreferredPrint?.id ?? null,
    commanderPreferredPrintImage: cmdPreferredPrint?.image ?? null,
    commanderPreferredPrintArt: cmdPreferredPrint?.artCrop ?? null,
    commanderPreferredPrintBackImage: cmdPreferredPrint?.backImage ?? null,
    commanderPreferredPrintBackArt: cmdPreferredPrint?.backArtCrop ?? null,
    partnerPreferredPrintId: ptnPreferredPrint?.id ?? null,
    partnerPreferredPrintImage: ptnPreferredPrint?.image ?? null,
    partnerPreferredPrintArt: ptnPreferredPrint?.artCrop ?? null,
    partnerPreferredPrintBackImage: ptnPreferredPrint?.backImage ?? null,
    partnerPreferredPrintBackArt: ptnPreferredPrint?.backArtCrop ?? null,
    companionScryfallId: companion?.id ?? null,
    companionName: companion?.name ?? null,
    companionTypeLine: companion?.type_line ?? null,
    companionImage: companion ? cardImage(companion) : null,
    companionArtCrop: companion ? cardArtCrop(companion) : null,
    companionPreferredPrintId: companionPreferredPrint?.id ?? null,
    companionPreferredPrintImage: companionPreferredPrint?.image ?? null,
    companionPreferredPrintArt: companionPreferredPrint?.artCrop ?? null,
    companionPreferredPrintBackImage: companionPreferredPrint?.backImage ?? null,
    companionPreferredPrintBackArt: companionPreferredPrint?.backArtCrop ?? null,
  });
  const [debouncedSaveJson] = useDebouncedValue(saveJson, 1000);
  useEffect(() => {
    if (!userModified.current || !canSave) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    upsert(JSON.parse(debouncedSaveJson));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSaveJson]);

  const img = cmdPreferredPrint?.image ?? (commander ? cardImage(commander) : null);
  const art = cmdPreferredPrint?.artCrop ?? (commander ? cardArtCrop(commander) : null);
  const partnerImg = ptnPreferredPrint?.image ?? (partner ? cardImage(partner) : null);
  const partnerArt = ptnPreferredPrint?.artCrop ?? (partner ? cardArtCrop(partner) : null);

  const cmdBackFace = commander?.card_faces?.[1]?.image_uris;
  const ptnBackFace = partner?.card_faces?.[1]?.image_uris;
  const cmdIsFlip = commander?.layout === "flip";
  const ptnIsFlip = partner?.layout === "flip";

  const companionImg = companionPreferredPrint?.image ?? (companion ? cardImage(companion) : null);
  const companionArt = companionPreferredPrint?.artCrop ?? (companion ? cardArtCrop(companion) : null);
  const cmpBackFace = companion?.card_faces?.[1]?.image_uris;
  const cmpIsFlip = companion?.layout === "flip";

  const displayTag = favoriteTag ?? tags[0] ?? null;
  const bracketLabel = BRACKETS.find((b) => b.value === bracket)?.label ?? null;
  const mark = () => { userModified.current = true; };

  // ── Deck list integration ─────────────────────────────────────────────────────
  const [importingToDeckList, setImportingToDeckList] = useState(false);
  const addToDeckList = api.decks.create.useMutation();

  const [importDeckModalOpen, setImportDeckModalOpen] = useState(false);
  const { data: userDecks = [] } = api.decks.getAll.useQuery(undefined, {
    enabled: !readOnly && importDeckModalOpen,
  });
  const matchingDecks = userDecks.filter((d) => d.colorId === colorId);

  const handleImportToDeckList = async () => {
    if (!commander) return;
    setImportingToDeckList(true);
    try {
      await addToDeckList.mutateAsync({
        name: commander.name,
        commanderScryfallId: commander.id,
        commanderName: commander.name,
        commanderTypeLine: commander.type_line,
        commanderImage: img ?? null,
        commanderArtCrop: art ?? null,
        partnerScryfallId: partner?.id ?? null,
        partnerName: partner?.name ?? null,
        partnerTypeLine: partner?.type_line ?? null,
        partnerImage: partnerImg ?? null,
        partnerArtCrop: partnerArt ?? null,
        partnerType: savedPartnerType ?? null,
        companionScryfallId: companion?.id ?? null,
        companionName: companion?.name ?? null,
        companionTypeLine: companion?.type_line ?? null,
        companionImage: companionImg ?? null,
        companionArtCrop: companionArt ?? null,
        bracket: (bracket as "1" | "2" | "3" | "4" | "5" | null) ?? null,
        tags: tags as Parameters<typeof addToDeckList.mutateAsync>[0]["tags"],
        favoriteTag: (favoriteTag as Parameters<typeof addToDeckList.mutateAsync>[0]["favoriteTag"]) ?? null,
        archetype: (archetype as Parameters<typeof addToDeckList.mutateAsync>[0]["archetype"]) ?? null,
        deckListUrl: deckListUrl ?? null,
        colorId: colorId ?? null,
      });
    } finally {
      setImportingToDeckList(false);
    }
  };

  const handleClearSelection = () => {
    mark();
    setCommander(null); setQuery(""); setResults([]); setCmdPreferredPrint(null);
    setPartner(null); setPartnerQuery(""); setPartnerResults([]); setSavedPartnerType(null); setPtnPreferredPrint(null);
    setHasCompanion(false); setCompanion(null); setCompanionQuery(""); setCompanionResults([]); setCompanionPreferredPrint(null);
    setBracket(null);
    setTags([]); setFavoriteTag(null);
    setArchetype(null);
    setDeckListUrl(null);
    setAllowRule0(false);
  };

  const handleImportFromDeck = (deck: Deck) => {
    mark();
    enrichedCmdId.current = null;
    enrichedPtnId.current = null;
    enrichedCmpId.current = null;

    if (deck.commanderName) {
      setQuery(deck.commanderName);
      setCommander({
        id: deck.commanderScryfallId ?? "",
        name: deck.commanderName,
        type_line: deck.commanderTypeLine ?? "",
        mana_cost: "",
        image_uris: deck.commanderImage && deck.commanderArtCrop
          ? { normal: deck.commanderImage, art_crop: deck.commanderArtCrop }
          : undefined,
      });
    }

    if (deck.partnerName) {
      setPartnerQuery(deck.partnerName);
      setPartner({
        id: deck.partnerScryfallId ?? "",
        name: deck.partnerName,
        type_line: deck.partnerTypeLine ?? "",
        mana_cost: "",
        image_uris: deck.partnerImage && deck.partnerArtCrop
          ? { normal: deck.partnerImage, art_crop: deck.partnerArtCrop }
          : undefined,
      });
      setSavedPartnerType((deck.partnerType as PartnerType) ?? null);
    } else {
      setPartner(null); setPartnerQuery(""); setPartnerResults([]);
      setSavedPartnerType(null); setPtnPreferredPrint(null);
    }

    if (deck.companionName) {
      setHasCompanion(true);
      setCompanionQuery(deck.companionName);
      setCompanion({
        id: deck.companionScryfallId ?? "",
        name: deck.companionName,
        type_line: deck.companionTypeLine ?? "",
        mana_cost: "",
        image_uris: deck.companionImage && deck.companionArtCrop
          ? { normal: deck.companionImage, art_crop: deck.companionArtCrop }
          : undefined,
      });
    } else {
      setHasCompanion(false); setCompanion(null);
      setCompanionQuery(""); setCompanionResults([]); setCompanionPreferredPrint(null);
    }

    setCmdPreferredPrint(null);
    setPtnPreferredPrint(null);
    setBracket(deck.bracket);
    try { setTags(JSON.parse(deck.tags) as string[]); } catch { setTags([]); }
    setFavoriteTag(deck.favoriteTag);
    setArchetype(deck.archetype);
    setDeckListUrl(deck.deckListUrl);
    setImportDeckModalOpen(false);
  };

  // True for the one render frame between initialData arriving and the hydration effect running.
  // During that frame commander is null even though we have data — show skeleton instead of flash.
  const pendingHydration = !commander && !!initialData?.commanderName;

  // ── Card minHeight ────────────────────────────────────────────────────────────
  // Prevents height pop when the summary content appears after the Collapse animation
  // finishes closing. The card is clamped at this height during the animation so the
  // summary materialises without a jump.
  //
  // Approximate Mantine xs-text line-height (12px font × 1.4) and badge row heights.
  const hasBadges = !!(bracketLabel || displayTag || archetype);
  const TEXT_H = 17;   // Text size="xs" line height
  const BADGE_H = 20;  // Badge size="xs" row
  const GAP = 4;       // Stack/Group gap

  let summaryH: number;
  if (!commander) {
    summaryH = TEXT_H; // "No commander selected"
  } else if (visual) {
    // Visual mode wraps text in a div with minHeight:60
    let textH = TEXT_H;
    if (partner) textH += GAP + TEXT_H;
    if (hasBadges) textH += GAP + BADGE_H;
    summaryH = Math.max(60, textH);
    if (art) summaryH += GAP + 120; // art image (120px conservative min; CSS aspect-ratio covers exact)
    if (companionArt) summaryH += GAP + 120; // companion row
  } else {
    summaryH = TEXT_H;
    if (partner) summaryH += GAP + TEXT_H;
    if (hasBadges) summaryH += GAP + BADGE_H;
  }
  // 42 = card padding-top(12) + header-height(18) + card padding-bottom(12)
  const cardMinHeight = 42 + summaryH;

  return (
    <Card ref={cardRef} withBorder padding="sm" style={{ minHeight: cardMinHeight }} onMouseDownCapture={() => { clickedInsideCard.current = true; }}>
      {/* ── Header ── */}
      <Group justify="space-between" wrap="nowrap" mb={collapseVisible ? "xs" : 0}>
        <Text size="xs" fw={700} lineClamp={1}>{name}</Text>
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {colors.length === 0
            ? <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ccc", border: "2px solid #999" }} />
            : colors.map((c) => <ManaSymbol key={c} color={c} />)
          }
          {isValidUrl(deckListUrl) && (
            <Tooltip label={t('mtg.selector.openDeckList')} withArrow position="top" openDelay={400}>
              <ActionIcon
                size="xs" variant="subtle" color="blue"
                component="a" href={deckListUrl!} target="_blank" rel="noopener noreferrer"
              >
                <IconList size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {!readOnly && (
            <Tooltip label={expanded ? t('mtg.selector.collapse') : t('mtg.selector.expand')} withArrow position="top" openDelay={400}>
              <ActionIcon size="xs" variant="subtle" onClick={handleToggle}>
                {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      {/* ── Contracted summary ── */}
      {!collapseVisible && (
        <CommanderCardBody
          commanderName={commander?.name ?? null}
          commanderArtCrop={art}
          commanderImage={img}
          commanderBackNormal={cmdPreferredPrint?.backImage ?? cmdBackFace?.normal}
          commanderBackArtCrop={cmdPreferredPrint?.backArtCrop ?? cmdBackFace?.art_crop}
          commanderCanFlip={cmdIsFlip}
          onCommanderGlimmerClick={readOnly ? undefined : () => setPrintPickerFor("commander")}
          partnerName={partner?.name ?? null}
          partnerLabel={partnerLabel ?? undefined}
          partnerArtCrop={partnerArt}
          partnerImage={partnerImg}
          partnerBackNormal={ptnPreferredPrint?.backImage ?? ptnBackFace?.normal}
          partnerBackArtCrop={ptnPreferredPrint?.backArtCrop ?? ptnBackFace?.art_crop}
          partnerCanFlip={ptnIsFlip}
          onPartnerGlimmerClick={readOnly ? undefined : () => setPrintPickerFor("partner")}
          companionName={companion?.name ?? null}
          companionArtCrop={companionArt}
          companionImage={companionImg}
          companionBackNormal={companionPreferredPrint?.backImage ?? cmpBackFace?.normal}
          companionBackArtCrop={companionPreferredPrint?.backArtCrop ?? cmpBackFace?.art_crop}
          companionCanFlip={cmpIsFlip}
          onCompanionGlimmerClick={readOnly ? undefined : () => setPrintPickerFor("companion")}
          bracketLabel={bracketLabel}
          displayTag={displayTag}
          archetype={archetype}
          visual={visual}
          isLoading={isLoading || pendingHydration}
          tooltipSide={tooltipSide}
          emptyText={t('mtg.selector.noCommander')}
        />
      )}

      {/* ── Expanded selectors ── */}
      {!readOnly && <Collapse in={expanded} onTransitionEnd={() => { if (!expanded) setCollapseVisible(false); }}>
        <Stack gap="xs">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="xs" c="dimmed" fw={500}>{t('mtg.selector.commander')}</Text>
            <Popover position="bottom-end" withArrow shadow="sm" width={190} withinPortal>
              <Popover.Target>
                <ActionIcon size="xs" variant="subtle" aria-label={t('mtg.selector.options')}>
                  <IconDots size={14} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown p="xs">
                <Stack gap="xs">
                  <Switch
                    size="xs"
                    label={t('mtg.selector.rule0')}
                    labelPosition="left"
                    checked={allowRule0}
                    onChange={(e) => { mark(); setAllowRule0(e.currentTarget.checked); }}
                    styles={{ body: { justifyContent: 'space-between', width: '100%' } }}
                  />
                  <Switch
                    size="xs"
                    label={t('mtg.selector.companion')}
                    labelPosition="left"
                    checked={hasCompanion}
                    onChange={(e) => {
                      mark();
                      setHasCompanion(e.currentTarget.checked);
                      if (!e.currentTarget.checked) {
                        setCompanion(null);
                        setCompanionQuery("");
                        setCompanionResults([]);
                        setCompanionPreferredPrint(null);
                      }
                    }}
                    styles={{ body: { justifyContent: 'space-between', width: '100%' } }}
                  />
                  <Divider />
                  <Button
                    size="xs"
                    variant="subtle"
                    color="teal"
                    leftSection={<IconLayersIntersect size={12} />}
                    fullWidth
                    justify="flex-start"
                    disabled={!commander}
                    loading={importingToDeckList}
                    onClick={() => void handleImportToDeckList()}
                  >
                    Add to deck list
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="indigo"
                    leftSection={<IconDownload size={12} />}
                    fullWidth
                    justify="flex-start"
                    onClick={() => setImportDeckModalOpen(true)}
                  >
                    Import from Decks
                  </Button>
                  <Divider />
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    leftSection={<IconEraser size={12} />}
                    fullWidth
                    justify="flex-start"
                    onClick={handleClearSelection}
                  >
                    {t('mtg.selector.clearSelection')}
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>
          <CardSearch
            placeholder={t('mtg.selector.searchCommander')}
            query={query} results={results} loading={loading} store={cmdStore}
            onQueryChange={(q) => { mark(); setQuery(q); setCommander(null); setSavedPartnerType(null); setCmdPreferredPrint(null); }}
            onSelect={(card) => { mark(); setCommander(card); setQuery(card?.name ?? ""); setCmdPreferredPrint(null); }}
            tooltipSide={tooltipSide}
          />

          {partnerType && (
            <>
              <Text size="xs" c="dimmed" fw={500}>{partnerLabel}</Text>
              {partnerType === "partner-with" ? (
                <InputBase
                  size="xs"
                  value={partnerLoading ? t('mtg.selector.loading') : (partnerQuery || (partnerWithName ?? ""))}
                  disabled
                  rightSection={partnerLoading ? <Loader size={12} /> : undefined}
                />
              ) : (
                <CardSearch
                  placeholder={partnerType === "background" ? t('mtg.selector.searchBackground') : t('mtg.selector.searchPartner')}
                  query={partnerQuery} results={partnerResults} loading={partnerLoading} store={ptnStore}
                  onQueryChange={(q) => { mark(); setPartnerQuery(q); setPartner(null); setPtnPreferredPrint(null); }}
                  onSelect={(card) => { mark(); setPartner(card); setPartnerQuery(card?.name ?? ""); setPtnPreferredPrint(null); }}
                  tooltipSide={tooltipSide}
                />
              )}
            </>
          )}

          {hasCompanion && (
            <>
              <Text size="xs" c="dimmed" fw={500}>{t('mtg.selector.companion')}</Text>
              <CardSearch
                placeholder={t('mtg.selector.searchCompanion')}
                query={companionQuery} results={companionResults} loading={companionLoading} store={cmpStore}
                onQueryChange={(q) => { mark(); setCompanionQuery(q); setCompanion(null); setCompanionPreferredPrint(null); }}
                onSelect={(card) => { mark(); setCompanion(card); setCompanionQuery(card?.name ?? ""); setCompanionPreferredPrint(null); }}
                tooltipSide={tooltipSide}
              />
            </>
          )}

          <Select size="xs" placeholder={t('mtg.selector.bracketPlaceholder')} data={BRACKETS} value={bracket}
            onChange={(v) => { mark(); setBracket(v); }} clearable
            renderOption={({ option }) => (
              <Stack gap={1} py={2}>
                <Text size="xs" fw={500}>{option.label}</Text>
                <Text size="xs" c="dimmed" lh={1.3}>{t(`mtg.brackets.desc${option.value}`)}</Text>
              </Stack>
            )}
          />
          <TagSelector
            tags={tags} setTags={(v) => { mark(); setTags(v); }}
            favoriteTag={favoriteTag} setFavoriteTag={(v) => { mark(); setFavoriteTag(v); }}
          />
          <Select
            size="xs"
            placeholder={t('mtg.selector.archetypePlaceholder')}
            data={ARCHETYPES}
            value={archetype}
            onChange={(v) => { mark(); setArchetype(v); }}
            clearable
            renderOption={({ option }) => {
              const descKey = `mtg.archetypes.${option.value.toLowerCase()}`;
              return (
                <Stack gap={1} py={2}>
                  <Text size="xs" fw={500}>{option.label}</Text>
                  <Text size="xs" c="dimmed" lh={1.3}>{t(descKey)}</Text>
                </Stack>
              );
            }}
          />
          <Group gap="xs" wrap="nowrap">
            <TextInput
              size="xs" placeholder={t('mtg.selector.deckListUrl')}
              value={deckListUrl ?? ""}
              onChange={(e) => { mark(); setDeckListUrl(e.currentTarget.value || null); }}
              style={{ flex: 1 }}
            />
            <Tooltip label={t('mtg.selector.goToMoxfield')} withArrow position="top">
              <ActionIcon
                size="sm" variant="subtle" color="blue"
                component="a" href={deckListUrl ?? "https://moxfield.com/decks"} target="_blank" rel="noopener noreferrer"
              >
                <IconExternalLink size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Collapse>}

      {!readOnly && (
        <Modal
          opened={importDeckModalOpen}
          onClose={() => setImportDeckModalOpen(false)}
          title={`Import from Decks — ${name}`}
          size="md"
          centered
        >
          {matchingDecks.length === 0 ? (
            <Text size="sm" c="dimmed">
              No decks found matching this color. Add some on the Decks page first.
            </Text>
          ) : (
            <SimpleGrid cols={2} spacing="xs">
              {matchingDecks.map((deck) => {
                const artCrop = deck.commanderArtCrop;
                const partnerArt = deck.partnerArtCrop;
                return (
                  <Card
                    key={deck.id}
                    withBorder
                    padding="xs"
                    onClick={() => handleImportFromDeck(deck)}
                    style={{ cursor: "pointer" }}
                  >
                    <Text size="xs" fw={700} lineClamp={1} mb={4}>
                      {deck.name ?? deck.commanderName ?? "Unnamed"}
                    </Text>
                    {deck.partnerName && (
                      <Text size="xs" c="dimmed" lineClamp={1} mb={4}>
                        + {deck.partnerName}
                      </Text>
                    )}
                    {artCrop ? (
                      <Group gap={4} wrap="nowrap" align="flex-start">
                        <div style={{ flex: partnerArt ? "0 0 calc(50% - 2px)" : "1 1 100%", overflow: "hidden", minWidth: 0 }}>
                          {partnerArt ? (
                            <Image src={artCrop} alt={deck.commanderName ?? ""} radius={0} loading="lazy"
                              style={{ width: "200%", maxWidth: "none", marginLeft: "-50%", display: "block", aspectRatio: "626/457", objectFit: "cover", borderRadius: "var(--mantine-radius-sm) 0 0 var(--mantine-radius-sm)" }}
                            />
                          ) : (
                            <Image src={artCrop} alt={deck.commanderName ?? ""} radius="sm" loading="lazy"
                              style={{ display: "block", aspectRatio: "626/457", objectFit: "cover", width: "100%" }}
                            />
                          )}
                        </div>
                        {partnerArt && (
                          <div style={{ flex: "0 0 calc(50% - 2px)", overflow: "hidden", minWidth: 0 }}>
                            <Image src={partnerArt} alt={deck.partnerName ?? ""} radius={0} loading="lazy"
                              style={{ width: "200%", maxWidth: "none", marginLeft: "-50%", display: "block", aspectRatio: "626/457", objectFit: "cover", borderRadius: "0 var(--mantine-radius-sm) var(--mantine-radius-sm) 0" }}
                            />
                          </div>
                        )}
                      </Group>
                    ) : (
                      <div style={{ aspectRatio: "626/457", background: "var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-sm)" }} />
                    )}
                  </Card>
                );
              })}
            </SimpleGrid>
          )}
        </Modal>
      )}

      {!readOnly && <PrintPickerModal
        opened={printPickerFor !== null}
        onClose={() => setPrintPickerFor(null)}
        cardName={
          printPickerFor === "commander" ? (commander?.name ?? "") :
          printPickerFor === "partner" ? (partner?.name ?? "") :
          (companion?.name ?? "")
        }
        currentPrintId={
          printPickerFor === "commander" ? (cmdPreferredPrint?.id ?? null) :
          printPickerFor === "partner" ? (ptnPreferredPrint?.id ?? null) :
          (companionPreferredPrint?.id ?? null)
        }
        onSelect={(id, image, artCrop, backImage, backArtCrop) => {
          mark();
          if (printPickerFor === "commander") setCmdPreferredPrint({ id, image, artCrop, backImage, backArtCrop });
          else if (printPickerFor === "partner") setPtnPreferredPrint({ id, image, artCrop, backImage, backArtCrop });
          else setCompanionPreferredPrint({ id, image, artCrop, backImage, backArtCrop });
        }}
        onClear={() => {
          mark();
          if (printPickerFor === "commander") setCmdPreferredPrint(null);
          else if (printPickerFor === "partner") setPtnPreferredPrint(null);
          else setCompanionPreferredPrint(null);
        }}
      />}
    </Card>
  );
}
