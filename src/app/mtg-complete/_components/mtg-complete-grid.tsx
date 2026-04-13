"use client";

import {
  ActionIcon,
  Button,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useClipboard, useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { IconCheck, IconCopy, IconPencil } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { CommanderSlot, type SelectionData, type SlotSnapshot } from "./commander-selector";
import { SelectionCharts } from "./selection-charts";

// ── Color combinations ────────────────────────────────────────────────────────

const COLOR_COMBINATIONS = [
  // Mono
  { id: "w", name: "White", colors: ["W"] },
  { id: "u", name: "Blue", colors: ["U"] },
  { id: "b", name: "Black", colors: ["B"] },
  { id: "r", name: "Red", colors: ["R"] },
  { id: "g", name: "Green", colors: ["G"] },
  // Two-color guilds
  { id: "wu", name: "Azorius", colors: ["W", "U"] },
  { id: "wb", name: "Orzhov", colors: ["W", "B"] },
  { id: "wr", name: "Boros", colors: ["W", "R"] },
  { id: "wg", name: "Selesnya", colors: ["W", "G"] },
  { id: "ub", name: "Dimir", colors: ["U", "B"] },
  { id: "ur", name: "Izzet", colors: ["U", "R"] },
  { id: "ug", name: "Simic", colors: ["U", "G"] },
  { id: "br", name: "Rakdos", colors: ["B", "R"] },
  { id: "bg", name: "Golgari", colors: ["B", "G"] },
  { id: "rg", name: "Gruul", colors: ["R", "G"] },
  // Three-color shards & wedges
  { id: "wub", name: "Esper", colors: ["W", "U", "B"] },
  { id: "wur", name: "Jeskai", colors: ["W", "U", "R"] },
  { id: "wug", name: "Bant", colors: ["W", "U", "G"] },
  { id: "wbr", name: "Mardu", colors: ["W", "B", "R"] },
  { id: "wbg", name: "Abzan", colors: ["W", "B", "G"] },
  { id: "wrg", name: "Naya", colors: ["W", "R", "G"] },
  { id: "ubr", name: "Grixis", colors: ["U", "B", "R"] },
  { id: "ubg", name: "Sultai", colors: ["U", "B", "G"] },
  { id: "urg", name: "Temur", colors: ["U", "R", "G"] },
  { id: "brg", name: "Jund", colors: ["B", "R", "G"] },
  // Four-color
  { id: "wubr", name: "Non-Green", colors: ["W", "U", "B", "R"] },
  { id: "wubg", name: "Non-Red", colors: ["W", "U", "B", "G"] },
  { id: "wurg", name: "Non-Black", colors: ["W", "U", "R", "G"] },
  { id: "wbrg", name: "Non-Blue", colors: ["W", "B", "R", "G"] },
  { id: "ubrg", name: "Non-White", colors: ["U", "B", "R", "G"] },
  // Five-color
  { id: "wubrg", name: "Five-Color", colors: ["W", "U", "B", "R", "G"] },
  // Colorless
  { id: "c", name: "Colorless", colors: [] },
];

// ── Shared data shape ─────────────────────────────────────────────────────────

export type SelectionRow = {
  colorId: string;
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
};

function toInitialData(s: SelectionRow): SelectionData {
  return {
    commanderScryfallId: s.commanderScryfallId,
    commanderName: s.commanderName,
    commanderTypeLine: s.commanderTypeLine,
    commanderImage: s.commanderImage,
    commanderArtCrop: s.commanderArtCrop,
    partnerScryfallId: s.partnerScryfallId,
    partnerName: s.partnerName,
    partnerTypeLine: s.partnerTypeLine,
    partnerImage: s.partnerImage,
    partnerArtCrop: s.partnerArtCrop,
    partnerType: s.partnerType,
    bracket: s.bracket,
    tags: s.tags,
    favoriteTag: s.favoriteTag,
    archetype: s.archetype,
    deckListUrl: s.deckListUrl,
    commanderPreferredPrintId: s.commanderPreferredPrintId,
    commanderPreferredPrintImage: s.commanderPreferredPrintImage,
    commanderPreferredPrintArt: s.commanderPreferredPrintArt,
    partnerPreferredPrintId: s.partnerPreferredPrintId,
    partnerPreferredPrintImage: s.partnerPreferredPrintImage,
    partnerPreferredPrintArt: s.partnerPreferredPrintArt,
  };
}

// ── Validation helper (mirrors server PAGE_NAME_SCHEMA) ───────────────────────

function getFormatError(value: string): string | null {
  const t = value.trim();
  if (t.length === 0) return null;
  if (t.length < 2) return "Name must be at least 2 characters";
  if (t.length > 32) return "Name must be at most 32 characters";
  if (!/^[a-zA-Z0-9'\-]+$/.test(t))
    return "Only letters, numbers, hyphens, and apostrophes are allowed (no spaces)";
  return null;
}

// ── Name modal (isolated so keystrokes don't re-render the grid) ──────────────

interface NameModalProps {
  opened: boolean;
  initialName: string;
  onDecline: () => void;
  onAccept: (name: string) => void;
}

function NameModal({ opened, initialName, onDecline, onAccept }: NameModalProps) {
  const [pendingName, setPendingName] = useState(initialName);

  // Reset field whenever a new initial name arrives (generated or pre-filled)
  useEffect(() => {
    setPendingName(initialName);
  }, [initialName]);

  const [debouncedName] = useDebouncedValue(pendingName, 200);

  const formatError = getFormatError(pendingName);

  const trimmedDebounced = debouncedName.trim();
  const debouncedFormatOk =
    trimmedDebounced.length >= 2 &&
    trimmedDebounced.length <= 32 &&
    /^[a-zA-Z0-9'\-]+$/.test(trimmedDebounced);

  const { data: nameCheck, isFetching: nameChecking } = api.mtg.checkPageName.useQuery(
    { name: trimmedDebounced },
    { enabled: debouncedFormatOk && opened, staleTime: 0, refetchOnWindowFocus: false },
  );

  const isTyping = debouncedName.trim() !== pendingName.trim();

  const availabilityError =
    !isTyping && debouncedFormatOk && nameCheck?.available === false
      ? "Name already taken"
      : null;

  const nameError = formatError ?? availabilityError;

  const canAccept =
    !isTyping &&
    !formatError &&
    debouncedFormatOk &&
    nameCheck?.available === true &&
    !nameChecking;

  const showLoader = (nameChecking || isTyping) && debouncedFormatOk;

  return (
    <Modal
      opened={opened}
      onClose={onDecline}
      title="Name your public deck list"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Choose a name for your public page. Others will see this when viewing your
          commander collection.
        </Text>
        <TextInput
          label="Page name"
          description="2–32 characters. Letters, numbers, hyphens, and apostrophes only. No spaces."
          value={pendingName}
          onChange={(e) => setPendingName(e.currentTarget.value)}
          error={nameError}
          placeholder="e.g. AncientDragon1024"
          maxLength={64}
          rightSection={showLoader ? <Loader size={14} /> : undefined}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onDecline}>
            Decline
          </Button>
          <Button onClick={() => onAccept(pendingName.trim())} disabled={!canAccept}>
            Accept
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── Grid component ────────────────────────────────────────────────────────────

export function MtgCompleteGrid({
  readOnly = false,
  preloadedSelections,
}: {
  readOnly?: boolean;
  preloadedSelections?: SelectionRow[];
}) {
  const [view, setView] = useState<"condensed" | "visual">("visual");
  const [localSnapshots, setLocalSnapshots] = useState<Record<string, SlotSnapshot>>({});
  const isSmallScreen = useMediaQuery("(max-width: 576px)") ?? false;
  const { data: session, status: sessionStatus } = useSession();

  const { data: selections, isLoading: selectionsLoading } = api.mtg.getSelections.useQuery(
    undefined,
    { enabled: !readOnly && !!session?.user },
  );

  const { data: pageInfo } = api.mtg.getPageVisibility.useQuery(undefined, {
    enabled: !readOnly && !!session?.user,
  });

  // Local switch state — optimistic, synced from server
  const [switchChecked, setSwitchChecked] = useState(false);
  useEffect(() => {
    if (pageInfo?.isPublic !== undefined) setSwitchChecked(pageInfo.isPublic);
  }, [pageInfo?.isPublic]);

  // Modal open/close, seed name, and whether it was opened to enable or rename
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [modalInitialName, setModalInitialName] = useState("");
  const [modalMode, setModalMode] = useState<"enable" | "rename">("enable");

  const utils = api.useUtils();

  const { mutate: setVisibility } = api.mtg.setPageVisibility.useMutation({
    onSuccess: () => void utils.mtg.getPageVisibility.invalidate(),
  });

  const { mutate: generateName, isPending: generatingName } =
    api.mtg.generatePageName.useMutation({
      onSuccess: (name) => {
        setModalInitialName(name);
        setModalMode("enable");
        setNameModalOpen(true);
      },
    });

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget.checked) {
      setSwitchChecked(true);
      if (pageInfo?.name) {
        setModalInitialName(pageInfo.name);
        setModalMode("enable");
        setNameModalOpen(true);
      } else {
        generateName();
      }
    } else {
      setSwitchChecked(false);
      setVisibility({ isPublic: false });
    }
  };

  const handleRename = () => {
    setModalInitialName(pageInfo?.name ?? "");
    setModalMode("rename");
    setNameModalOpen(true);
  };

  const handleDecline = () => {
    // Only revert the switch when declining from the enable flow
    if (modalMode === "enable") setSwitchChecked(false);
    setNameModalOpen(false);
  };

  const handleAccept = (name: string) => {
    setVisibility({ isPublic: true, name });
    setNameModalOpen(false);
  };

  // Share URL — populated client-side to avoid hydration mismatch
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const shareUrl =
    switchChecked && origin && pageInfo?.name
      ? `${origin}/mtg-complete/${pageInfo.name}`
      : null;

  const clipboard = useClipboard({ timeout: 1500 });

  const resolvedSelections: SelectionRow[] = readOnly
    ? (preloadedSelections ?? [])
    : (selections ?? []);

  const handleLocalChange = useCallback((colorId: string, snapshot: SlotSnapshot) => {
    setLocalSnapshots((prev) => ({ ...prev, [colorId]: snapshot }));
  }, []);

  // Merge local slot state on top of server data so charts update immediately on edit.
  const chartSelections: SelectionRow[] = COLOR_COMBINATIONS.map((combo) => {
    const server = resolvedSelections.find((s) => s.colorId === combo.id);
    const local = localSnapshots[combo.id];
    if (!local) return server ?? ({ colorId: combo.id, tags: "[]" } as SelectionRow);
    return {
      ...(server ?? ({ colorId: combo.id } as SelectionRow)),
      commanderScryfallId: local.commanderScryfallId,
      bracket: local.bracket,
      tags: JSON.stringify(local.tags),
      archetype: local.archetype,
    } as SelectionRow;
  });

  return (
    <Stack>
      <NameModal
        opened={nameModalOpen}
        initialName={modalInitialName}
        onDecline={handleDecline}
        onAccept={handleAccept}
      />

      <SelectionCharts selections={chartSelections} />

      <Group justify="space-between" wrap="nowrap">
        <SegmentedControl
          w="fit-content"
          value={view}
          onChange={(v) => setView(v as "condensed" | "visual")}
          data={[
            { label: "Visual", value: "visual" },
            { label: "Condensed", value: "condensed" },
          ]}
        />
        {!readOnly && !!session?.user && (
          <Group gap="xs" wrap="nowrap">
            <Switch
              label="Public page"
              checked={switchChecked}
              onChange={handleSwitchChange}
              disabled={generatingName}
            />
            {generatingName && <Loader size={14} />}
            {shareUrl && (
              <>
                <Tooltip label={clipboard.copied ? "Copied!" : "Copy link"} withArrow>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => clipboard.copy(shareUrl)}
                    color={clipboard.copied ? "teal" : undefined}
                  >
                    {clipboard.copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Rename list" withArrow>
                  <ActionIcon variant="subtle" onClick={handleRename}>
                    <IconPencil size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Group>
        )}
      </Group>
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
        {/* useMemo prevents all 32 slots re-rendering on every localSnapshot update */}
        {useMemo(() => COLOR_COMBINATIONS.map((combo) => {
          const saved = readOnly
            ? preloadedSelections?.find((s) => s.colorId === combo.id)
            : selections?.find((s) => s.colorId === combo.id);

          const initialData = saved ? toInitialData(saved as SelectionRow) : undefined;

          return (
            <CommanderSlot
              key={combo.id}
              colorId={combo.id}
              name={combo.name}
              colors={combo.colors}
              visual={view === "visual"}
              initialData={initialData}
              canSave={!readOnly && !!session?.user}
              isLoading={!readOnly && (sessionStatus === "loading" || (!!session?.user && selectionsLoading))}
              readOnly={readOnly}
              isSmallScreen={isSmallScreen}
              onLocalChange={readOnly ? undefined : handleLocalChange}
            />
          );
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }), [view, selections, preloadedSelections, session?.user, sessionStatus, selectionsLoading, readOnly, handleLocalChange])}
      </SimpleGrid>
    </Stack>
  );
}
