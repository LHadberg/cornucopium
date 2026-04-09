"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Combobox,
  Group,
  HoverCard,
  Image,
  InputBase,
  Loader,
  Modal,
  MultiSelect,
  ScrollArea,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconFlipVertical,
  IconList,
  IconRotate2,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
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
  partnerPreferredPrintId: string | null;
  partnerPreferredPrintImage: string | null;
  partnerPreferredPrintArt: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string }> = {
  W: { bg: "#f5f0e8", border: "#c8b87a" },
  U: { bg: "#1a6fac", border: "#0d4f8a" },
  B: { bg: "#0a0a0a", border: "#3a3a3a" },
  R: { bg: "#d44026", border: "#a03020" },
  G: { bg: "#2d7a3a", border: "#1a5227" },
};

const BRACKETS = [
  { value: "1", label: "1 — Exhibition" },
  { value: "2", label: "2 — Core" },
  { value: "3", label: "3 — Upgraded" },
  { value: "4", label: "4 — Optimized" },
  { value: "5", label: "5 — cEDH" },
];

const ARCHETYPES = ["Aggro", "Combo", "Control", "Midrange", "Stax", "Tempo"];

const TAGS = [
  "Aristocrats", "Enchantress", "Extra Turns", "Group Hug", "Hatebears",
  "Infect", "Landfall", "Mill", "Pillowfort", "Politics", "Ramp",
  "Reanimator", "Spellslinger", "Storm", "Superfriends", "Tokens", "Tribal", "Voltron",
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

// ── Sub-components ────────────────────────────────────────────────────────────

function ManaSymbol({ color }: { color: string }) {
  const s = COLOR_MAP[color];
  return (
    <div style={{
      width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
      background: s?.bg ?? "#aaa", border: `2px solid ${s?.border ?? "#888"}`,
    }} />
  );
}

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
              <HoverCard width={260} position="right" openDelay={200} closeDelay={0} withinPortal>
                <HoverCard.Target>
                  <div>
                    <Text size="xs" fw={500}>{card.name}</Text>
                    <Text size="xs" c="dimmed">{card.type_line}</Text>
                  </div>
                </HoverCard.Target>
                {cardImage(card) && (
                  <HoverCard.Dropdown p={4}>
                    <Image src={cardImage(card)!} alt={card.name} radius={20} loading="lazy" />
                  </HoverCard.Dropdown>
                )}
              </HoverCard>
            </Combobox.Option>
          )) : (
            <Combobox.Empty>
              <Text size="xs">
                {loading ? "Searching…" : query.length >= 2 ? "No results" : "Type to search"}
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
  return (
    <MultiSelect
      size="xs" placeholder="Tags…" data={TAGS} value={tags}
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

// Golden glimmer sparkle
function GlimmerSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
      <path d="M9 1L10.6 7.4L17 9L10.6 10.6L9 17L7.4 10.6L1 9L7.4 7.4Z" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      <path d="M14.5 2L15.2 4.8L18 5.5L15.2 6.2L14.5 9L13.8 6.2L11 5.5L13.8 4.8Z" fill="#FFD700" opacity="0.75" />
      <path d="M3.5 11L4 12.9L6 13.4L4 13.9L3.5 15.8L3 13.9L1 13.4L3 12.9Z" fill="#FFD700" opacity="0.6" />
    </svg>
  );
}

// Art image with hover card preview and optional glimmer for print selection
function ArtImage({ artCrop, normal, name, flex, half, onGlimmerClick, backNormal, backArtCrop, canFlip }: {
  artCrop: string; normal: string; name: string; flex?: string; half?: "left" | "right";
  onGlimmerClick?: () => void;
  backNormal?: string; backArtCrop?: string;
  canFlip?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const displayNormal = showBack && backNormal ? backNormal : normal;

  const wrapperStyle: React.CSSProperties = half
    ? {
      flex: "0 0 calc(50% - 2px)",
      overflow: "hidden",
      minWidth: 0,
      position: "relative",
      cursor: "default",
      borderRadius: half === "left"
        ? "var(--mantine-radius-sm) 0 0 var(--mantine-radius-sm)"
        : "0 var(--mantine-radius-sm) var(--mantine-radius-sm) 0",
    }
    : { flex: flex ?? "1 1 100%", minWidth: 0, position: "relative", cursor: "default" };

  return (
    <HoverCard width={260} position="right" openDelay={300} closeDelay={150} withinPortal>
      <HoverCard.Target>
        <div style={wrapperStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          {half ? (
            <Image src={artCrop} alt={name} radius={0} loading="lazy"
              style={{ width: "200%", maxWidth: "none", marginLeft: "-50%", display: "block" }}
            />
          ) : (
            <Image
              src={artCrop} alt={name} radius="sm" loading="lazy"
              style={{
                display: "block",
                ...(canFlip ? { aspectRatio: "626/457", objectFit: "cover", width: "100%" } : {}),
              }}
            />
          )}
          {onGlimmerClick && hovered && (
            <button
              className="art-glimmer-btn"
              style={{ position: "absolute", bottom: 4, right: 4, zIndex: 1 }}
              onClick={(e) => { e.stopPropagation(); onGlimmerClick(); }}
              title="Select art version"
            >
              <GlimmerSvg />
            </button>
          )}
        </div>
      </HoverCard.Target>
      <HoverCard.Dropdown p={4}>
        <div style={{ position: "relative" }}>
          <Image
            src={displayNormal} alt={name} radius={20} loading="lazy"
            style={{ transform: flipped ? "rotate(180deg)" : undefined }}
          />
          {backNormal && (
            <button
              className="art-glimmer-btn"
              style={{ position: "absolute", bottom: 8, left: 8, zIndex: 1 }}
              onClick={(e) => { e.stopPropagation(); setShowBack((v) => !v); }}
              title={showBack ? "Show front face" : "Show back face"}
            >
              <IconRotate2 size={28} color="#FFD700" />
            </button>
          )}
          {canFlip && (
            <button
              className="art-glimmer-btn"
              style={{ position: "absolute", bottom: 8, right: 8, zIndex: 1 }}
              onClick={(e) => { e.stopPropagation(); setFlipped((v) => !v); }}
              title={flipped ? "Show top face" : "Show flipped face"}
            >
              <IconFlipVertical size={28} color="#FFD700" />
            </button>
          )}
        </div>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

// Print version picker modal
interface PrintPickerModalProps {
  opened: boolean;
  onClose: () => void;
  cardName: string;
  currentPrintId: string | null;
  onSelect: (id: string, image: string, artCrop: string) => void;
  onClear: () => void;
}

function PrintPickerModal({ opened, onClose, cardName, currentPrintId, onSelect, onClear }: PrintPickerModalProps) {
  const [prints, setPrints] = useState<ScryfallPrint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened || !cardName) return;
    setLoading(true);
    setPrints([]);
    fetchPrints(cardName).then(setPrints).finally(() => setLoading(false));
  }, [opened, cardName]);

  return (
    <Modal opened={opened} onClose={onClose} title={`Art versions — ${cardName}`} size="xl" centered>
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
                    onClick={() => { onSelect(print.id, pImg, pArt); onClose(); }}
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
                Use default art
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface CommanderSlotProps {
  colorId: string;
  name: string;
  colors: string[];
  visual?: boolean;
  initialData?: SelectionData;
  canSave?: boolean;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function CommanderSlot({
  colorId, name, colors, visual = false, initialData, canSave = false, isLoading = false, readOnly = false,
}: CommanderSlotProps) {
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

  // Preferred print overrides (id + image URLs for commander / partner)
  const [cmdPreferredPrint, setCmdPreferredPrint] = useState<{ id: string; image: string; artCrop: string } | null>(null);
  const [ptnPreferredPrint, setPtnPreferredPrint] = useState<{ id: string; image: string; artCrop: string } | null>(null);
  // null = closed, 'commander' | 'partner' = open for that card
  const [printPickerFor, setPrintPickerFor] = useState<"commander" | "partner" | null>(null);

  const userModified = useRef(false);
  const hasHydrated = useRef(false);
  const enrichedCmdId = useRef<string | null>(null);
  const enrichedPtnId = useRef<string | null>(null);

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
      setCmdPreferredPrint({ id: initialData.commanderPreferredPrintId, image: initialData.commanderPreferredPrintImage, artCrop: initialData.commanderPreferredPrintArt });
    }
    if (initialData.partnerPreferredPrintId && initialData.partnerPreferredPrintImage && initialData.partnerPreferredPrintArt) {
      setPtnPreferredPrint({ id: initialData.partnerPreferredPrintId, image: initialData.partnerPreferredPrintImage, artCrop: initialData.partnerPreferredPrintArt });
    }
  }, [initialData]);

  // Enrich commander with card_faces / layout if missing (e.g. after hydration from DB)
  useEffect(() => {
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
  }, [commander?.id]);

  // Enrich partner with card_faces / layout if missing
  useEffect(() => {
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
  }, [partner?.id]);

  // Commander search
  useEffect(() => {
    if (debounced.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    searchCommanders(colorId, debounced).then(setResults).finally(() => setLoading(false));
  }, [colorId, debounced]);

  // Reset / auto-resolve partner when commander changes
  useEffect(() => {
    // Skip during hydration — partner is already set from DB, and partnerType may not yet be
    // derivable (oracle_text absent on hydrated card) so we'd incorrectly clear it.
    if (!userModified.current) return;
    if (!commander || !partnerType) {
      setPartner(null); setPartnerQuery(""); setPartnerResults([]); setSavedPartnerType(null);
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
    if (partnerType !== "partner" && partnerType !== "background") { setPartnerResults([]); return; }
    if (debouncedPartner.trim().length < 2) { setPartnerResults([]); return; }
    setPartnerLoading(true);
    const fn = partnerType === "background" ? searchBackgrounds : searchPartners;
    fn(debouncedPartner).then(setPartnerResults).finally(() => setPartnerLoading(false));
  }, [debouncedPartner, partnerType]);

  // Persist
  const { mutate: upsert } = api.mtg.upsertSelection.useMutation();
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
    partnerPreferredPrintId: ptnPreferredPrint?.id ?? null,
    partnerPreferredPrintImage: ptnPreferredPrint?.image ?? null,
    partnerPreferredPrintArt: ptnPreferredPrint?.artCrop ?? null,
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

  const displayTag = favoriteTag ?? tags[0] ?? null;
  const bracketLabel = BRACKETS.find((b) => b.value === bracket)?.label ?? null;
  const mark = () => { userModified.current = true; };

  const badges = (
    <>
      {bracketLabel && <Badge size="xs" variant="filled" color="blue">{bracketLabel}</Badge>}
      {displayTag && <Badge size="xs" variant="filled" color="yellow">{displayTag}</Badge>}
      {archetype && <Badge size="xs" variant="filled" color="grape">{archetype}</Badge>}
    </>
  );

  return (
    <Card withBorder padding="sm" onMouseDownCapture={() => { clickedInsideCard.current = true; }}>
      {/* ── Header ── */}
      <Group justify="space-between" wrap="nowrap" mb={collapseVisible ? "xs" : 0}>
        <Text size="xs" fw={700} lineClamp={1}>{name}</Text>
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {colors.length === 0
            ? <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ccc", border: "2px solid #999" }} />
            : colors.map((c) => <ManaSymbol key={c} color={c} />)
          }
          {isValidUrl(deckListUrl) && (
            <Tooltip label="Open Deck List" withArrow position="top" openDelay={400}>
              <ActionIcon
                size="xs" variant="subtle" color="blue"
                component="a" href={deckListUrl!} target="_blank" rel="noopener noreferrer"
              >
                <IconList size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {!readOnly && (
            <Tooltip label={expanded ? "Collapse" : "Expand"} withArrow position="top" openDelay={400}>
              <ActionIcon size="xs" variant="subtle" onClick={handleToggle}>
                {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      {/* ── Contracted summary ── */}
      {!collapseVisible && (
        isLoading ? (
          <Stack gap={6} mt={4}>
            <Skeleton height={11} width="70%" radius="sm" />
            <Skeleton height={9} width="45%" radius="sm" />
          </Stack>
        ) : (
          <HoverCard width={250} position="right" openDelay={400} closeDelay={0} disabled={!img || visual} withinPortal>
            <HoverCard.Target>
              <Stack gap={4}>
                {commander ? (
                  visual ? (
                    <>
                      <div style={{ minHeight: 60, display: "flex", flexDirection: "column", gap: 4 }}>
                        <Text size="xs" fw={500} lineClamp={1}>{commander.name}</Text>
                        {partner && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {partnerLabel}: {partner.name}
                          </Text>
                        )}
                        <Group gap={4} wrap="wrap">{badges}</Group>
                      </div>
                      <Group gap={4} wrap="nowrap" align="flex-start">
                        {art && img && (
                          <ArtImage
                            artCrop={art} normal={img} name={commander.name}
                            half={partnerArt ? "left" : undefined}
                            flex="1 1 100%"
                            onGlimmerClick={readOnly ? undefined : () => setPrintPickerFor("commander")}
                            backNormal={cmdBackFace?.normal}
                            backArtCrop={cmdBackFace?.art_crop}
                            canFlip={cmdIsFlip}
                          />
                        )}
                        {partnerArt && partnerImg && (
                          <ArtImage
                            artCrop={partnerArt} normal={partnerImg} name={partner!.name}
                            half="right"
                            onGlimmerClick={readOnly ? undefined : () => setPrintPickerFor("partner")}
                            backNormal={ptnBackFace?.normal}
                            backArtCrop={ptnBackFace?.art_crop}
                            canFlip={ptnIsFlip}
                          />
                        )}
                      </Group>
                    </>
                  ) : (
                    <>
                      <Text size="xs" fw={500} lineClamp={1}>{commander.name}</Text>
                      {partner && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {partnerLabel}: {partner.name}
                        </Text>
                      )}
                      <Group gap={4} wrap="wrap">{badges}</Group>
                    </>
                  )
                ) : (
                  <Text size="xs" c="dimmed">No commander selected</Text>
                )}
              </Stack>
            </HoverCard.Target>
            <HoverCard.Dropdown p={4}>
              <Image src={img!} alt={commander?.name} radius={20} loading="lazy" />
            </HoverCard.Dropdown>
          </HoverCard>
        )
      )}

      {/* ── Expanded selectors ── */}
      {!readOnly && <Collapse in={expanded} onTransitionEnd={() => { if (!expanded) setCollapseVisible(false); }}>
        <Stack gap="xs">
          <CardSearch
            placeholder="Search commander…"
            query={query} results={results} loading={loading} store={cmdStore}
            onQueryChange={(q) => { mark(); setQuery(q); setCommander(null); setSavedPartnerType(null); }}
            onSelect={(card) => { mark(); setCommander(card); setQuery(card?.name ?? ""); }}
          />

          {partnerType && (
            <>
              <Text size="xs" c="dimmed" fw={500}>{partnerLabel}</Text>
              {partnerType === "partner-with" ? (
                <InputBase
                  size="xs"
                  value={partnerLoading ? "Loading…" : (partnerQuery || (partnerWithName ?? ""))}
                  disabled
                  rightSection={partnerLoading ? <Loader size={12} /> : undefined}
                />
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

          <Select size="xs" placeholder="Bracket…" data={BRACKETS} value={bracket}
            onChange={(v) => { mark(); setBracket(v); }} clearable />
          <TagSelector
            tags={tags} setTags={(v) => { mark(); setTags(v); }}
            favoriteTag={favoriteTag} setFavoriteTag={(v) => { mark(); setFavoriteTag(v); }}
          />
          <Select size="xs" placeholder="Archetype…" data={ARCHETYPES} value={archetype}
            onChange={(v) => { mark(); setArchetype(v); }} clearable />
          <Group gap="xs" wrap="nowrap">
            <TextInput
              size="xs" placeholder="Deck list URL…"
              value={deckListUrl ?? ""}
              onChange={(e) => { mark(); setDeckListUrl(e.currentTarget.value || null); }}
              style={{ flex: 1 }}
            />
            <Tooltip label="Go to Moxfield" withArrow position="top">
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

      {!readOnly && <PrintPickerModal
        opened={printPickerFor !== null}
        onClose={() => setPrintPickerFor(null)}
        cardName={printPickerFor === "commander" ? (commander?.name ?? "") : (partner?.name ?? "")}
        currentPrintId={printPickerFor === "commander" ? (cmdPreferredPrint?.id ?? null) : (ptnPreferredPrint?.id ?? null)}
        onSelect={(id, image, artCrop) => {
          mark();
          if (printPickerFor === "commander") setCmdPreferredPrint({ id, image, artCrop });
          else setPtnPreferredPrint({ id, image, artCrop });
        }}
        onClear={() => {
          mark();
          if (printPickerFor === "commander") setCmdPreferredPrint(null);
          else setPtnPreferredPrint(null);
        }}
      />}
    </Card>
  );
}
