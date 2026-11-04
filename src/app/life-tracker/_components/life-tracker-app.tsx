"use client";

import {
  Accordion,
  ActionIcon,
  Alert,
  Button,
  CheckIcon,
  ColorSwatch,
  Group,
  Loader,
  Menu,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconBolt,
  IconGauge,
  IconCrown,
  IconCrownFilled,
  IconCamera,
  IconTaxPound,
  IconDice,
  IconSkull,
  IconFlame,
  IconMaximize,
  IconMenu2,
  IconMinimize,
  IconMinus,
  IconMoodSmile,
  IconPlus,
  IconRefresh,
  IconStar,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../dice-roller/_i18n/i18n";
import classes from "../_styles/LifeTracker.module.css";

import themeStyles from "../_styles/LifeTrackerThemes.module.css";
import { savedGameSchema, GAME_STORAGE_KEY } from "./saved-game";
import { CounterPressButton } from "./counter-press-button";
import { CommanderControls } from "./commander-controls";

const MAX_PLAYERS = 4;
const DAMAGE_FLASH_MS = 750;
const HOLD_MS = 500;
const HOLD_DELTA = 10;
const LIFE_REPEAT_MS = 500;
const PHOTO_SIZE = 480;
const SPOTLIGHT_HOLD_MS = 2500;
const SPOTLIGHT_FADE_MS = 600;
const ORIENTATION_STORAGE_KEY = "life-tracker-orientation";

const AREA_COLORS = [
  "#b03a48",
  "#2e6db4",
  "#2f8f5b",
  "#7d4cba",
  "#c77b30",
  "#2a9d9f",
  "#b13b8c",
  "#4a5568",
];

type PhotoSlot = "resting" | "damage";
type CounterKey = "poison" | "energy" | "experience" | "tax" | "speed";
type CounterValueKey = CounterKey | "partnerTax";

interface PhotoFocus {
  x: number;
  y: number;
}

interface Player {
  id: number;
  name: string;
  life: number;
  color: string;
  photos: Record<PhotoSlot, string | null>;
  photoFocus: Record<PhotoSlot, PhotoFocus>;
  photoFit: "cover" | "contain";
  counters: Record<CounterValueKey, number>;
  counterToggles: CounterToggles;
  partnerCommanders: boolean;
  commanderDamage: Record<number, number>;
}

interface CameraTarget {
  playerId: number;
  slot: PhotoSlot;
}

type CounterToggles = Record<CounterKey, boolean>;
/** Which screen edge a player's text and controls point toward (their seat) */
type Orientation = "left" | "right" | "top" | "bottom";
type OrientationMode = "outward" | "down" | "roundtable";
type SpotlightPhase = "spin" | "won" | "fading";

// screen.orientation.lock/unlock are missing from lib.dom and from some browsers
type LockableOrientation = {
  type: string;
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

const COUNTER_DEFS: {
  key: CounterKey;
  step: number;
  icon: typeof IconSkull;
}[] = [
  { key: "poison", step: 1, icon: IconSkull },
  { key: "energy", step: 1, icon: IconBolt },
  { key: "speed", step: 1, icon: IconGauge },
  { key: "experience", step: 1, icon: IconStar },
  { key: "tax", step: 2, icon: IconTaxPound },
];

function makePlayers(startingLife: number): Player[] {
  return Array.from({ length: MAX_PLAYERS }, (_, i) => ({
    id: i,
    name: i18n.t("lifeTracker.playerName", { number: i + 1 }),
    life: startingLife,
    color: AREA_COLORS[i] ?? "#4a5568",
    photos: { resting: null, damage: null },
    photoFocus: { resting: { x: 50, y: 50 }, damage: { x: 50, y: 50 } },
    photoFit: "cover",
    counters: { poison: 0, energy: 0, experience: 0, tax: 0, partnerTax: 0, speed: 0 },
    counterToggles: { poison: false, energy: false, experience: false, tax: false, speed: false },
    partnerCommanders: false,
    commanderDamage: {},
  }));
}

/** Center-crop an image element/frame to a mirrored square JPEG data URL. */
function frameToDataUrl(
  source: HTMLVideoElement | HTMLImageElement,
  width: number,
  height: number,
  mirror: boolean,
): string | null {
  const size = Math.min(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (mirror) {
    ctx.translate(PHOTO_SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    source,
    (width - size) / 2,
    (height - size) / 2,
    size,
    size,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE,
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}

function fileToDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dataUrl = frameToDataUrl(img, img.naturalWidth, img.naturalHeight, false);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function CameraModal({
  target,
  onClose,
  onCapture,
}: {
  target: CameraTarget | null;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const opened = target !== null;

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(i18n.t("lifeTracker.cameraUnavailable"));
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        setError(i18n.t("lifeTracker.cameraError"));
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [opened]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const dataUrl = frameToDataUrl(video, video.videoWidth, video.videoHeight, true);
    if (dataUrl) {
      onCapture(dataUrl);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(target?.slot === "damage" ? "lifeTracker.snapDamage" : "lifeTracker.snapResting")}
      centered
    >
      <Stack>
        {error ? (
          <Alert color="red">{error}</Alert>
        ) : (
          <video ref={videoRef} className={classes.cameraPreview} autoPlay playsInline muted />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("lifeTracker.cancel")}
          </Button>
          <Button leftSection={<IconCamera size={16} />} onClick={capture} disabled={!!error}>
            {t("lifeTracker.capture")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function PhotoSlotMenu({
  slot,
  hasPhoto,
  onTakePhoto,
  onUpload,
  onClear,
}: {
  slot: PhotoSlot;
  hasPhoto: boolean;
  onTakePhoto: () => void;
  onUpload: () => void;
  onClear: () => void;
}) {
  const Icon = slot === "damage" ? IconFlame : IconMoodSmile;
  const { t } = useTranslation();
  return (
    <Menu position="bottom" withArrow>
      <Menu.Target>
        <Button
          size="compact-xs"
          variant={hasPhoto ? "light" : "default"}
          color={slot === "damage" ? "red" : "blue"}
          leftSection={<Icon size={14} />}
        >
          {t(slot === "damage" ? "lifeTracker.damage" : "lifeTracker.resting")}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconCamera size={14} />} onClick={onTakePhoto}>
          {t("lifeTracker.takePhoto")}
        </Menu.Item>
        <Menu.Item leftSection={<IconUpload size={14} />} onClick={onUpload}>
          {t("lifeTracker.uploadPhoto")}
        </Menu.Item>
        {hasPhoto && (
          <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onClear}>
            {t("lifeTracker.removePhoto")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

function FocusPicker({
  src,
  focus,
  aspect,
  onChange,
}: {
  src: string;
  focus: PhotoFocus;
  /** Width/height ratio of the play area the image will cover */
  aspect: number;
  onChange: (focus: PhotoFocus) => void;
}) {
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    onChange({ x: Math.round(x), y: Math.round(y) });
  };

  // The cover crop of the (square) image for an area of this aspect ratio
  const a = aspect > 0 ? aspect : 1;
  let left = 0;
  let top = 0;
  let width = 100;
  let height = 100;
  if (a >= 1) {
    height = 100 / a;
    top = (focus.y / 100) * (100 - height);
  } else {
    width = 100 * a;
    left = (focus.x / 100) * (100 - width);
  }

  return (
    <div
      className={classes.focusPicker}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) pick(e);
      }}
    >
      <img src={src} alt="" draggable={false} className={classes.focusImage} />
      <div
        className={classes.focusRegion}
        style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      />
      <div className={classes.focusMarker} style={{ left: `${focus.x}%`, top: `${focus.y}%` }} />
    </div>
  );
}

type ControlSide = "left" | "right" | "top" | "bottom";

const OPPOSITE_SIDE: Record<ControlSide, ControlSide> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

function LifePressZone({
  sign,
  label,
  className,
  onLifeChange,
}: {
  sign: 1 | -1;
  label: string;
  className: string;
  onLifeChange: (delta: number) => void;
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const activePointer = useRef<number | null>(null);
  const changeRef = useRef(onLifeChange);
  useEffect(() => { changeRef.current = onLifeChange; }, [onLifeChange]);

  const cancelHold = useCallback(() => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    activePointer.current = null;
  }, []);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) cancelHold(); };
    window.addEventListener("blur", cancelHold);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelHold();
      window.removeEventListener("blur", cancelHold);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cancelHold]);

  return (
    <UnstyledButton
      className={className}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0 || activePointer.current !== null) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        cancelHold();
        activePointer.current = e.pointerId;
        held.current = false;
        const repeat = () => {
          if (activePointer.current === null) return;
          held.current = true;
          changeRef.current(sign * HOLD_DELTA);
          holdTimer.current = setTimeout(repeat, LIFE_REPEAT_MS);
        };
        holdTimer.current = setTimeout(repeat, HOLD_MS);
      }}
      onPointerUp={(e) => {
        if (activePointer.current !== e.pointerId) return;
        const wasHeld = held.current;
        cancelHold();
        held.current = false;
        if (!wasHeld) onLifeChange(sign);
      }}
      onPointerCancel={cancelHold}
      onLostPointerCapture={cancelHold}
      onClick={(e) => {
        // Keyboard activation only — pointer input is fully handled above
        if (e.detail === 0) onLifeChange(sign);
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function PlayerArea({
  player,
  isStartingPlayer,
  monarchEnabled,
  isMonarch,
  onClaimMonarch,
  opponents,
  flashAmount,
  spotlight,
  orientation,
  controlsSide,
  onLifeChange,
  onCounterChange,
  onCommanderChange,
}: {
  player: Player;
  isStartingPlayer: boolean;
  monarchEnabled: boolean;
  isMonarch: boolean;
  onClaimMonarch: () => void;
  opponents: Player[];
  flashAmount: number | null;
  spotlight: SpotlightPhase | null;
  orientation: Orientation;
  controlsSide: ControlSide;
  onLifeChange: (delta: number) => void;
  onCounterChange: (key: CounterValueKey, delta: number) => void;
  onCommanderChange: (fromId: number, delta: number) => void;
}) {
  const { t } = useTranslation();
  const isHurt = flashAmount !== null && flashAmount < 0;
  const isGain = flashAmount !== null && flashAmount > 0;
  const activeSlot: PhotoSlot = isHurt && player.photos.damage ? "damage" : "resting";
  const photo = player.photos[activeSlot];
  const photoFocus = player.photoFocus[activeSlot];
  const visibleCounters = COUNTER_DEFS.filter((c) => player.counterToggles[c.key]);
  const orientClass =
    orientation === "left"
      ? classes.faceLeft
      : orientation === "right"
        ? classes.faceRight
        : orientation === "top"
          ? classes.faceTop
          : "";
  // Callouts open toward the area center so they don't clip on the edge
  const calloutSide = OPPOSITE_SIDE[controlsSide];
  const horizontalControls = controlsSide === "top" || controlsSide === "bottom";
  const sideClass = (side: ControlSide) =>
    side === "left" ? classes.sideLeft : side === "right" ? classes.sideRight :
    side === "top" ? classes.sideTop : classes.sideBottom;

  const renderCounters = (counters: typeof visibleCounters) =>
    counters.length > 0 ? (
      <div className={classes.controlColumn}>
        {counters.map((def) => (
          <div className={classes.counterPair} key={def.key}>
            {Array.from({ length: def.key === "tax" && player.partnerCommanders ? 2 : 1 }, (_, index) => {
              const key: CounterValueKey = index === 1 ? "partnerTax" : def.key;
              return <CounterPressButton key={key}
                label={def.key === "tax" ? t("lifeTracker.commanderTaxSlot", { number: index + 1, value: player.counters[key] }) : t(`lifeTracker.counter.${def.key}`) + ": " + player.counters[key]}
                onChange={(sign) => onCounterChange(key, sign * def.step)}
                style={{ "--opponent": player.color } as React.CSSProperties}
                className={`${classes.themedCounter} ${key === "speed" && player.counters.speed === 4 ? classes.counterAtCap : ""}`} partner={index === 1}>
                <def.icon size={14} />
                <span>{player.counters[key]}</span>
              </CounterPressButton>;
            })}
          </div>
        ))}
      </div>
    ) : null;

  const countersColumn = renderCounters(visibleCounters.filter((counter) => counter.key !== "tax"));
  const taxColumn = renderCounters(visibleCounters.filter((counter) => counter.key === "tax"));

  return (
    <div data-life-zone data-monarch-highlight={isMonarch ? "border" : undefined} className={classes.area} style={{ background: player.color, "--player-color": player.color } as React.CSSProperties}>
      <div className={`${classes.areaInner} ${orientClass} ${horizontalControls ? classes.horizontalControls : ""}`}>
        <div className={classes.areaFill}>
          {photo && (
            <div
              className={classes.areaPhoto}
              style={{
                backgroundImage: `url(${photo})`,
                backgroundPosition: player.photoFit === "contain" ? "center" : `${photoFocus.x}% ${photoFocus.y}%`,
                backgroundSize: player.photoFit,
              }}
            />
          )}
          {(isHurt || isGain) && (
            <div
              // Keyed overlay: the flash animation restarts on every consecutive
              // change without remounting the controls (which would close callouts)
              key={`flash-${flashAmount}`}
              className={`${classes.flashOverlay} ${isHurt ? classes.hurt : classes.gained}`}
            >
              <Text
                className={`${classes.flashBadge} ${
                  controlsSide === "left" ? classes.badgeRight : classes.badgeLeft
                } ${isGain ? classes.gainBadge : classes.hurtBadge}`}
                fz={32}
                fw={900}
              >
                {isGain ? `+${flashAmount}` : flashAmount}
              </Text>
            </div>
          )}

          {spotlight && (
            <div
              className={`${classes.spotlight} ${
                spotlight !== "spin" ? classes.spotlightWon : ""
              } ${spotlight === "fading" ? classes.spotlightFade : ""}`}
            />
          )}

          <LifePressZone
            sign={-1}
            className={`${classes.lifeHalf} ${classes.lifeHalfMinus}`}
            label={t("lifeTracker.decreaseLife", { name: player.name })}
            onLifeChange={onLifeChange}
          />
          <LifePressZone
            sign={1}
            className={`${classes.lifeHalf} ${classes.lifeHalfPlus}`}
            label={t("lifeTracker.increaseLife", { name: player.name })}
            onLifeChange={onLifeChange}
          />

          {(taxColumn || monarchEnabled) && (
            <div data-tax-controls className={`${classes.sideControls} ${sideClass(controlsSide)} ${monarchEnabled ? classes.monarchControls : ""}`}>
              {monarchEnabled && (
                <ActionIcon
                  className={classes.monarchButton}
                  variant="subtle"
                  color={isMonarch ? "yellow" : "gray"}
                  aria-label={t("lifeTracker.claimMonarch", { name: player.name })}
                  aria-pressed={isMonarch}
                  onClick={onClaimMonarch}
                >
                  {isMonarch ? <IconCrownFilled size={24} /> : <IconCrown size={24} />}
                </ActionIcon>
              )}
              {taxColumn}
            </div>
          )}
          {countersColumn && (
            <div
              data-counter-controls
              className={`${classes.sideControls} ${
                sideClass(calloutSide)
              }`}
            >
              {countersColumn}
            </div>
          )}

          <CommanderControls opponents={opponents} damage={player.commanderDamage} onChange={onCommanderChange} />
          <div className={`${classes.areaContent} ${classes.commanderContent}`}>
            <Text fw={600} data-player-name data-starting-player={isStartingPlayer || undefined} className={classes.nameLabel}>
              {player.name}
            </Text>

            <Group gap="lg" wrap="nowrap" justify="center">
              {/* Visual hints only — the tap targets are the half-area zones */}
              <div data-life-hint className={classes.lifeButton}>
                <IconMinus />
              </div>
              <Text component="div" data-life-value className={classes.lifeValue}>
                {player.life}
              </Text>
              <div data-life-hint className={classes.lifeButton}>
                <IconPlus />
              </div>
            </Group>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerSettingsForm({
  player,
  onPhotoFitChange,
  unavailableColors,
  onRename,
  onColorChange,
  onToggleCounter,
  onTogglePartners,
  onOpenCamera,
  onUploadPhoto,
  onClearPhoto,
  onSetFocus,
  areaAspect,
}: {
  player: Player | null;
  onPhotoFitChange: (fit: "cover" | "contain") => void;
  unavailableColors: string[];
  areaAspect: number;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  onToggleCounter: (key: CounterKey, value: boolean) => void;
  onTogglePartners: (value: boolean) => void;
  onSetFocus: (slot: PhotoSlot, focus: PhotoFocus) => void;
  onOpenCamera: (slot: PhotoSlot) => void;
  onUploadPhoto: (slot: PhotoSlot, file: File) => void;
  onClearPhoto: (slot: PhotoSlot) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSlotRef = useRef<PhotoSlot>("resting");
  const { t } = useTranslation();

  const startUpload = (slot: PhotoSlot) => {
    uploadSlotRef.current = slot;
    fileInputRef.current?.click();
  };

  return (
    <>
      {player && (
        <Stack>
          <Switch label={t("lifeTracker.partnerCommanders")} checked={player.partnerCommanders} onChange={(e) => onTogglePartners(e.currentTarget.checked)} />
          <TextInput
            autoFocus
            label={t("lifeTracker.name")}
            value={player.name}
            onChange={(e) => onRename(e.currentTarget.value)}
          />

          <div>
            <Text size="sm" fw={500} mb={6}>
              {t("lifeTracker.areaColor")}
            </Text>
            <SimpleGrid cols={4} spacing="xs" style={{ justifyItems: "center" }}>
              {AREA_COLORS.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  component="button"
                  type="button"
                  disabled={unavailableColors.includes(color)}
                  onClick={() => onColorChange(color)}
                  style={{ cursor: unavailableColors.includes(color) ? "not-allowed" : "pointer", opacity: unavailableColors.includes(color) ? 0.3 : 1, color: "#fff" }}
                  aria-pressed={player.color === color}
                  aria-label={t("lifeTracker.useColor", { color })}
                >
                  {player.color === color && <CheckIcon size={12} />}
                </ColorSwatch>
              ))}
            </SimpleGrid>
          </div>

          <div>
            <Text size="sm" fw={500} mb={6}>
              {t("lifeTracker.counters")}
            </Text>
            <Stack gap="xs">
              {COUNTER_DEFS.map((def) => (
                <Switch
                  key={def.key}
                  label={t(`lifeTracker.counter.${def.key}`)}
                  checked={player.counterToggles[def.key]}
                  onChange={(e) => onToggleCounter(def.key, e.currentTarget.checked)}
                />
              ))}
            </Stack>
          </div>

          <div>
            <Text size="sm" fw={500} mb={4}>
              {t("lifeTracker.images")}
            </Text>
            <Text size="xs" c="dimmed" mb={8}>
              {t("lifeTracker.imagesDescription")}
            </Text>
            <SegmentedControl
              fullWidth mb="sm"
              aria-label={t("lifeTracker.imageFit")}
              value={player.photoFit}
              onChange={(value) => { if (value === "cover" || value === "contain") onPhotoFitChange(value); }}
              data={[
                { value: "cover", label: t("lifeTracker.fitArea") },
                { value: "contain", label: t("lifeTracker.fitImage") },
              ]}
            />
            <Group gap="xs">
              <PhotoSlotMenu
                slot="resting"
                hasPhoto={!!player.photos.resting}
                onTakePhoto={() => onOpenCamera("resting")}
                onUpload={() => startUpload("resting")}
                onClear={() => onClearPhoto("resting")}
              />
              <PhotoSlotMenu
                slot="damage"
                hasPhoto={!!player.photos.damage}
                onTakePhoto={() => onOpenCamera("damage")}
                onUpload={() => startUpload("damage")}
                onClear={() => onClearPhoto("damage")}
              />
            </Group>
            {player.photoFit === "cover" && (player.photos.resting || player.photos.damage) && (
              <>
                <Text size="xs" c="dimmed" mt={10} mb={4}>
                  {t("lifeTracker.focusHint")}
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  {(["resting", "damage"] as const).map((slot) => {
                    const url = player.photos[slot];
                    if (!url) return null;
                    return (
                      <div key={slot}>
                        <Text size="xs" fw={500} mb={4}>
                          {t(slot === "damage" ? "lifeTracker.damage" : "lifeTracker.resting")}
                        </Text>
                        <FocusPicker
                          src={url}
                          focus={player.photoFocus[slot]}
                          aspect={areaAspect}
                          onChange={(focus) => onSetFocus(slot, focus)}
                        />
                      </div>
                    );
                  })}
                </SimpleGrid>
              </>
            )}
          </div>
        </Stack>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) onUploadPhoto(uploadSlotRef.current, file);
          e.currentTarget.value = "";
        }}
      />
    </>
  );
}

export function LifeTrackerApp() {
  const [theme, setTheme] = useState<"A" | "B" | "D">("A");
  const [saveError, setSaveError] = useState(false);
  const { t } = useTranslation();
  const [startingLife, setStartingLife] = useState(40);
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState<Player[]>(() => makePlayers(40));
  const [flash, setFlash] = useState<Record<number, number | null>>({});
  const [starter, setStarter] = useState<string | null>(null);
  const [starterId, setStarterId] = useState<number | null>(null);
  const [monarchEnabled, setMonarchEnabled] = useState(false);
  const [monarchId, setMonarchId] = useState<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [gameSetupOpen, setGameSetupOpen] = useState<string | null>(null);
  const [playerSettingsId, setPlayerSettingsId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // null = not yet known (avoids a hydration mismatch and a "not supported" flash)
  const [fullscreenAvailable, setFullscreenAvailable] = useState<boolean | null>(null);
  const [boardRotation, setBoardRotation] = useState<"none" | "cw" | "ccw">("none");
  const [settingsAspect, setSettingsAspect] = useState(1);
  // Starts as "outward"/portrait on the server render; corrected after mount.
  // The board stays hidden behind a loader until both corrections have landed,
  // so the user never sees the defaults flip to the real values.
  const [orientationMode, setOrientationMode] = useState<OrientationMode>("outward");
  const [boardLandscape, setBoardLandscape] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [boardMeasured, setBoardMeasured] = useState(false);
  const boardReady = settingsLoaded && boardMeasured;
  const boardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState<{ id: number; phase: SpotlightPhase } | null>(
    null,
  );
  const flashTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const spotlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinActive = useRef(false);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      if (spotlightTimer.current) clearTimeout(spotlightTimer.current);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ORIENTATION_STORAGE_KEY);
      if (stored === "outward" || stored === "down" || stored === "roundtable") setOrientationMode(stored);
    } catch {
      // Storage unavailable (privacy mode) — keep the default
    }
    try {
      const raw = localStorage.getItem(GAME_STORAGE_KEY);
      const saved = raw ? savedGameSchema.safeParse(JSON.parse(raw)) : null;
      if (saved?.success) {
        const game = saved.data;
        setPlayers(game.players);
        setPlayerCount(game.playerCount);
        setStartingLife(game.startingLife);
        setOrientationMode(game.orientationMode);
        setTheme(game.theme);
        setStarter(game.starter);
        setStarterId(game.starterId ?? game.players.find((player) => player.name === game.starter)?.id ?? null);
        setMonarchEnabled(game.monarchEnabled);
        setMonarchId(game.monarchId);
      }
    } catch {
      // Invalid or inaccessible saved data must not prevent opening the board.
    }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    const save = () => {
      try {
        localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
          version: 1, players, playerCount, startingLife, orientationMode, theme, starter, starterId, monarchEnabled, monarchId,
        }));
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    };
    save();
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [settingsLoaded, players, playerCount, startingLife, orientationMode, theme, starter, starterId, monarchEnabled, monarchId]);

  const changeOrientationMode = useCallback((mode: OrientationMode) => {
    setOrientationMode(mode);
    try {
      localStorage.setItem(ORIENTATION_STORAGE_KEY, mode);
    } catch {
      // Storage unavailable — the setting still applies for this session
    }
  }, []);

  useEffect(() => {
    // The board's layout box ignores the counter-rotation transform, so this
    // is the aspect the grid actually composes in (portrait on rotated phones,
    // possibly landscape in a wide desktop window)
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(() => {
      setBoardLandscape(board.clientWidth > board.clientHeight);
      setBoardMeasured(true);
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const resetGameState = useCallback(() => {
    setMonarchEnabled(false);
    setMonarchId(null);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        life: startingLife,
        counters: { poison: 0, energy: 0, experience: 0, tax: 0, partnerTax: 0, speed: 0 },
        commanderDamage: {},
      })),
    );
    setFlash({});
    setStarter(null);
    setStarterId(null);
  }, [startingLife]);

  const decideStartingPlayer = useCallback(() => {
    if (spinActive.current) return;
    const order = players.slice(0, playerCount).map((p) => ({ id: p.id, name: p.name }));
    const n = order.length;
    if (n === 0) return;
    resetGameState();
    spinActive.current = true;
    setGameSetupOpen(null);

    const winnerIdx = Math.floor(Math.random() * n);
    // Enough full loops that even a 2-player spin feels like a wheel
    const loops = Math.max(3, Math.ceil(10 / n));
    const total = loops * n + winnerIdx;

    const step = (i: number) => {
      const entry = order[i % n];
      if (!entry) return;
      if (i === total) {
        setSpotlight({ id: entry.id, phase: "won" });
        setStarter(entry.name);
        setStarterId(entry.id);
        spotlightTimer.current = setTimeout(() => {
          setSpotlight({ id: entry.id, phase: "fading" });
          spotlightTimer.current = setTimeout(() => {
            setSpotlight(null);
            spotlightTimer.current = null;
            spinActive.current = false;
          }, SPOTLIGHT_FADE_MS);
        }, SPOTLIGHT_HOLD_MS);
        return;
      }
      setSpotlight({ id: entry.id, phase: "spin" });
      // Hops start fast and slow down quadratically toward the winner
      const t = (i + 1) / total;
      spotlightTimer.current = setTimeout(() => step(i + 1), 60 + 320 * t * t);
    };
    // Let the setup panel visibly collapse before revealing the selection animation.
    const delay = gameSetupOpen && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 0;
    spotlightTimer.current = setTimeout(() => {
      setSettingsOpened(false);
      step(0);
    }, delay);
  }, [players, playerCount, gameSetupOpen, resetGameState]);

  useEffect(() => {
    setFullscreenAvailable(document.fullscreenEnabled ?? false);
    const onChange = () => {
      const active = document.fullscreenElement !== null;
      setIsFullscreen(active);
      if (!active) {
        // Covers every exit path: our button, Esc, and the back gesture
        (screen.orientation as unknown as LockableOrientation).unlock?.();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    // Touch devices only — a wide desktop window should not rotate the board
    if (orientationMode === "down") {
      (window.screen.orientation as unknown as LockableOrientation).unlock?.();
    }
    const mq = window.matchMedia("(pointer: coarse) and (orientation: landscape)");
    const update = () => {
      if (!mq.matches || orientationMode === "down") {
        setBoardRotation("none");
        return;
      }
      // Counter the OS content rotation so the pixels on the physical panel
      // match the portrait rendering exactly, whichever way the device turned
      const angle = window.screen.orientation?.angle ?? 90;
      setBoardRotation(angle === 270 ? "cw" : "ccw");
    };
    update();
    mq.addEventListener("change", update);
    window.screen.orientation?.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      window.screen.orientation?.removeEventListener("change", update);
    };
  }, [orientationMode]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
      const orientation = screen.orientation as unknown as LockableOrientation;
      // Lock to whatever orientation the table is set up in right now
      if (orientationMode !== "down") await orientation.lock?.(orientation.type);
    } catch {
      // Fullscreen or the lock isn't supported here (e.g. iPhone, desktop) — keep going without it
    }
  }, [orientationMode]);

  const flashChange = useCallback((id: number, amount: number) => {
    // Consecutive changes within the flash window accumulate into one badge
    setFlash((f) => {
      const total = (f[id] ?? 0) + amount;
      return { ...f, [id]: total === 0 ? null : total };
    });
    clearTimeout(flashTimers.current[id]);
    flashTimers.current[id] = setTimeout(() => {
      setFlash((f) => ({ ...f, [id]: null }));
    }, DAMAGE_FLASH_MS);
  }, []);

  const adjustLife = useCallback(
    (id: number, delta: number) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, life: p.life + delta } : p)),
      );
      if (delta !== 0) flashChange(id, delta);
    },
    [flashChange],
  );

  const toggleCounter = useCallback((id: number, key: CounterKey, value: boolean) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, counterToggles: { ...p.counterToggles, [key]: value } }
          : p,
      ),
    );
  }, []);

  const adjustCounter = useCallback((id: number, key: CounterValueKey, delta: number) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, counters: { ...p.counters, [key]: Math.min(key === "speed" ? 4 : Infinity, Math.max(0, p.counters[key] + delta)) } }
          : p,
      ),
    );
  }, []);

  const adjustCommander = useCallback(
    (id: number, fromId: number, delta: number) => {
      const target = players.find((p) => p.id === id);
      if (!target) return;
      const current = target.commanderDamage[fromId] ?? 0;
      const applied = Math.max(0, current + delta) - current;
      if (applied === 0) return;
      // Commander damage is also life loss, so the life total follows along
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                life: p.life - applied,
                commanderDamage: { ...p.commanderDamage, [fromId]: current + applied },
              }
            : p,
        ),
      );
      if (applied > 0) flashChange(id, -applied);
    },
    [players, flashChange],
  );

  const setPhoto = useCallback((id: number, slot: PhotoSlot, dataUrl: string | null) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              photos: { ...p.photos, [slot]: dataUrl },
              // A new or removed image starts centered again
              photoFocus: { ...p.photoFocus, [slot]: { x: 50, y: 50 } },
            }
          : p,
      ),
    );
  }, []);

  const setPhotoFocus = useCallback((id: number, slot: PhotoSlot, focus: PhotoFocus) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, photoFocus: { ...p.photoFocus, [slot]: focus } } : p,
      ),
    );
  }, []);

  const uploadPhoto = useCallback(
    async (id: number, slot: PhotoSlot, file: File) => {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl) setPhoto(id, slot, dataUrl);
    },
    [setPhoto],
  );

  const resetLife = useCallback((life: number) => {
    setPlayers((prev) => prev.map((p) => ({ ...p, life })));
  }, []);

  const resetGame = useCallback(() => {
    resetGameState();
    setSettingsOpened(false);
  }, [resetGameState]);

  // Two players share the board as side-by-side columns only when seated
  // outward on a portrait board; everywhere else stacked rows fit the
  // reading direction better.
  const twoPlayerRows = playerCount === 2 && (orientationMode !== "outward" || boardLandscape);
  const roundtableFour = orientationMode === "roundtable" && playerCount === 4;

  // Outward seating puts players along the board's longer sides: left/right
  // on a portrait board, top/bottom on a landscape one. "down" keeps every
  // area upright for a single viewer.
  const orientationFor = (index: number): Orientation => {
    if (orientationMode === "down") return "bottom";
    if (orientationMode === "roundtable") {
      if (playerCount === 2) return index === 0 ? "top" : "bottom";
      if (playerCount === 3) return index === 0 ? "left" : index === 1 ? "right" : "bottom";
      // Full-width top and bottom seats surround the two middle side seats.
      return (["top", "left", "right", "bottom"] as const)[index] ?? "bottom";
    }
    if (boardLandscape) return index < (playerCount === 2 ? 1 : 2) ? "top" : "bottom";
    if (playerCount === 3 && index === 2) return "bottom";
    return index % 2 === 0 ? "left" : "right";
  };

  // Which local side of the (possibly rotated) frame lands on the screen edge
  // away from the center button; callouts then open toward the middle.
  const controlsSideFor = (index: number): ControlSide => {
    if (roundtableFour) return index === 0 || index === 1 ? "left" : "right";
    if (orientationMode === "down") {
      if (boardLandscape) return index % 2 === 0 ? "left" : "right";
      return index < (playerCount === 2 ? 1 : 2) ? "top" : "bottom";
    }
    const orientation = orientationFor(index);
    if (orientation === "left" || orientation === "right") {
      // Side seats: in a 4-player grid the bottom row mirrors the top row
      if (playerCount === 4) return index === 0 || index === 3 ? "left" : "right";
      return index === 0 ? "left" : "right";
    }
    // Upright or inverted seats: aim for the outer vertical screen edge
    // (full-width areas default to the right edge)
    const fullWidth = playerCount === 2 ? twoPlayerRows : playerCount === 3 && index === 2;
    const screenSide = !fullWidth && index % 2 === 0 ? "left" : "right";
    // An inverted area's local sides are mirrored on screen
    if (orientation === "top") return screenSide === "left" ? "right" : "left";
    return screenSide;
  };

  const openPlayerSettings = (playerId: number, gridIndex: number) => {
    // Measure this player's cell (in board coordinates, which transforms
    // don't affect) so the focus picker can show the real cover crop
    const board = boardRef.current;
    if (board) {
      const cell = board.children[gridIndex] as HTMLElement | undefined;
      if (cell && cell.clientWidth > 0 && cell.clientHeight > 0) {
        const orientation = orientationFor(gridIndex);
        const upright = orientation === "top" || orientation === "bottom";
        setSettingsAspect(upright ? cell.clientWidth / cell.clientHeight : cell.clientHeight / cell.clientWidth);
      }
    }
    setPlayerSettingsId(playerId);
  };

  const activePlayers = players.slice(0, playerCount);
  // Grid cells fill row-major (TL, TR, BL, BR); swapping the bottom row makes
  // the seat order go clockwise around the table: 1 TL, 2 TR, 3 BR, 4 BL.
  const displayPlayers = [...activePlayers];
  if (roundtableFour) {
    // Clockwise player order: top, right, bottom, left.
    displayPlayers.splice(0, 4, activePlayers[0]!, activePlayers[3]!, activePlayers[1]!, activePlayers[2]!);
  } else if (playerCount === 4) {
    const third = displayPlayers[2];
    const fourth = displayPlayers[3];
    if (third && fourth) {
      displayPlayers[2] = fourth;
      displayPlayers[3] = third;
    }
  }
  const stepPlayerSettings = (direction: number) => {
    const index = activePlayers.findIndex((player) => player.id === playerSettingsId);
    const next = activePlayers[index + direction];
    if (next) {
      openPlayerSettings(next.id, displayPlayers.findIndex((player) => player.id === next.id));
    } else {
      setPlayerSettingsId(null);
    }
  };
  const settingsPlayer = players.find((p) => p.id === playerSettingsId) ?? null;
  const layoutClass =
    roundtableFour ? (boardLandscape ? classes.layoutRoundtableLandscape : classes.layoutRoundtable) : playerCount === 2
      ? twoPlayerRows
        ? classes.layout2Rows
        : classes.layout2
      : playerCount === 3
        ? classes.layout3
        : classes.layout4;

  return (
    <div data-visual-variant={theme} className={`${classes.boardViewport} ${themeStyles.theme} ${isFullscreen ? classes.boardFullscreen : ""}`}>
      {saveError && <Alert color="orange" style={{ position: "absolute", top: 8, left: 8, right: 8, zIndex: 20 }} withCloseButton onClose={() => setSaveError(false)}>{t("lifeTracker.saveError")}</Alert>}
      {!boardReady && (
        <div className={classes.boardLoader}>
          <Loader />
        </div>
      )}
      <div
        ref={boardRef}
        // Kept mounted while hidden so the ResizeObserver can take the
        // initial measurement that flips boardReady
        className={`${classes.board} ${layoutClass} ${
          boardReady ? "" : classes.boardHidden
        } ${
          boardRotation === "cw"
            ? classes.boardRotateCw
            : boardRotation === "ccw"
              ? classes.boardRotateCcw
              : ""
        }`}
      >
      {displayPlayers.map((player, index) => (
        <PlayerArea
          key={player.id}
          player={player}
          isStartingPlayer={player.id === starterId}
          monarchEnabled={monarchEnabled}
          isMonarch={monarchEnabled && player.id === monarchId}
          onClaimMonarch={() => setMonarchId(player.id)}
          opponents={activePlayers.filter((p) => p.id !== player.id)}
          orientation={orientationFor(index)}
          controlsSide={controlsSideFor(index)}
          flashAmount={flash[player.id] ?? null}
          spotlight={spotlight && spotlight.id === player.id ? spotlight.phase : null}
          onLifeChange={(delta) => adjustLife(player.id, delta)}
          onCounterChange={(key, delta) => adjustCounter(player.id, key, delta)}
          onCommanderChange={(fromId, delta) => adjustCommander(player.id, fromId, delta)}
        />
      ))}

      <div className={classes.centerWrap}>
        <ActionIcon
          className={classes.centerButton}
          variant="default"
          size={56}
          radius="xl"
          onClick={() => { setPlayerSettingsId(null); setSettingsOpened(true); }}
          aria-label={t("lifeTracker.generalSettings")}
        >
          <IconMenu2 size={26} />
        </ActionIcon>
      </div>

      <Modal
        opened={settingsOpened}
        onClose={() => { setSettingsOpened(false); setPlayerSettingsId(null); }}
        title={
          <Group gap="xs" wrap="nowrap">
            {settingsPlayer !== null && (
              <ActionIcon
                variant="subtle"
                aria-label={t("lifeTracker.backToGeneral")}
                onClick={() => setPlayerSettingsId(null)}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            )}
            <span>{t("lifeTracker.generalSettings")}</span>
          </Group>
        }
        centered
      >
        {settingsPlayer === null ? <Stack>
          <Accordion value={gameSetupOpen} onChange={setGameSetupOpen} transitionDuration={250} variant="contained">
            <Accordion.Item value="setup">
              <Accordion.Control>{t("lifeTracker.gameSetup")}</Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  <div>
                    <Text size="sm" fw={500} mb={6}>
                      {t("lifeTracker.players")}
                    </Text>
                    <SegmentedControl
                      fullWidth
                      value={String(playerCount)}
                      onChange={(v) => setPlayerCount(Number(v))}
                      data={[2, 3, 4].map((n) => ({
                        label: t("lifeTracker.playersOption", { n }),
                        value: String(n),
                      }))}
                    />
                  </div>
                  <div>
                    <Text size="sm" fw={500} mb={6}>
                      {t("lifeTracker.startingLife")}
                    </Text>
                    <SegmentedControl
                      fullWidth
                      value={String(startingLife)}
                      onChange={(v) => {
                        const life = Number(v);
                        setStartingLife(life);
                        resetLife(life);
                      }}
                      data={[20, 40].map((n) => ({
                        label: t("lifeTracker.lifeOption", { n }),
                        value: String(n),
                      }))}
                    />
                  </div>
                  <div>
                    <Text size="sm" fw={500} mb={6}>
                      {t("lifeTracker.orientation")}
                    </Text>
                    <SegmentedControl
                      fullWidth
                      value={orientationMode}
                      styles={{ label: { whiteSpace: "normal" } }}
                      onChange={(v) => changeOrientationMode(v as OrientationMode)}
                      data={[
                        { label: t("lifeTracker.orientationOutward"), value: "outward" },
                        { label: t("lifeTracker.orientationDown"), value: "down" },
                        { label: t("lifeTracker.orientationRoundtable"), value: "roundtable" },
                      ]}
                    />
                  </div>
                  <div>
                    <Text size="sm" fw={500} mb={6}>{t("lifeTracker.theme")}</Text>
                    <SegmentedControl fullWidth value={theme} onChange={(value) => {
                      if (value === "A" || value === "B" || value === "D") setTheme(value);
                    }} data={[{ value: "A", label: "Moody" }, { value: "B", label: "Pastel" }, { value: "D", label: "Neon" }]} />
                  </div>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          <div>
            <Text fw={600} mb="xs">{t("lifeTracker.playerSettings")}</Text>
            <SimpleGrid cols={2} spacing="xs">
              {activePlayers.map((player) => (
                <Button key={player.id} variant="default" fullWidth
                  onClick={() => openPlayerSettings(player.id, displayPlayers.findIndex((p) => p.id === player.id))}>
                  {player.name}
                </Button>
              ))}
            </SimpleGrid>
          </div>
          <div>
            <Button
              fullWidth
              variant="default"
              leftSection={
                isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />
              }
              onClick={() => void toggleFullscreen()}
              disabled={fullscreenAvailable === false}
            >
              {t(isFullscreen ? "lifeTracker.exitFullscreen" : "lifeTracker.fullscreen")}
            </Button>
            {fullscreenAvailable === false && (
              <Text size="xs" c="dimmed" mt={4} ta="center">
                {t("lifeTracker.fullscreenUnsupported")}
              </Text>
            )}
          </div>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={resetGame}
          >
            {t("lifeTracker.resetGame")}
          </Button>
          <div>
            <Button
              fullWidth
              leftSection={<IconDice size={16} />}
              onClick={decideStartingPlayer}
            >
              {t("lifeTracker.decideStartingPlayer")}
            </Button>
            {starter && (
              <Text ta="center" fw={600} mt={8}>
                {t("lifeTracker.starts", { name: starter })}
              </Text>
            )}
          </div>
          <Button
            fullWidth
            variant="filled"
            color="#ffd700"
            autoContrast
            leftSection={<IconCrown size={18} />}
            disabled={monarchEnabled}
            onClick={() => { setMonarchEnabled(true); setSettingsOpened(false); }}
            styles={{ label: { whiteSpace: "normal" }, root: { height: "auto", minHeight: 36, paddingBlock: 8 } }}
          >
            {t(monarchEnabled ? "lifeTracker.monarchEnabled" : "lifeTracker.enableMonarch")}
          </Button>
        </Stack> : <Stack>
          <Text fw={600} aria-live="polite">
            {t("lifeTracker.playerSetupProgress", { current: activePlayers.findIndex((p) => p.id === playerSettingsId) + 1, total: playerCount })}
          </Text>
          <PlayerSettingsForm
            key={settingsPlayer.id}
            player={settingsPlayer}
            onPhotoFitChange={(photoFit) => setPlayers((prev) => prev.map((player) => player.id === playerSettingsId ? { ...player, photoFit } : player))}
            unavailableColors={activePlayers.filter((player) => player.id !== settingsPlayer.id).map((player) => player.color)}
            areaAspect={settingsAspect}
            onRename={(name) =>
              setPlayers((prev) =>
                prev.map((p) => (p.id === playerSettingsId ? { ...p, name } : p)),
              )
            }
            onColorChange={(color) =>
              setPlayers((prev) =>
                prev.map((p) => (p.id === playerSettingsId ? { ...p, color } : p)),
              )
            }
            onTogglePartners={(value) => setPlayers((prev) => prev.map((p) => p.id === playerSettingsId ? { ...p, partnerCommanders: value } : p))}
            onToggleCounter={(key, value) => {
              if (playerSettingsId !== null) toggleCounter(playerSettingsId, key, value);
            }}
            onSetFocus={(slot, focus) => {
              if (playerSettingsId !== null) setPhotoFocus(playerSettingsId, slot, focus);
            }}
            onOpenCamera={(slot) => {
              if (playerSettingsId !== null) setCameraTarget({ playerId: playerSettingsId, slot });
            }}
            onUploadPhoto={(slot, file) => {
              if (playerSettingsId !== null) void uploadPhoto(playerSettingsId, slot, file);
            }}
            onClearPhoto={(slot) => {
              if (playerSettingsId !== null) setPhoto(playerSettingsId, slot, null);
            }}
          />
          <Group grow>
            <Button variant="default" disabled={playerSettingsId === activePlayers[0]?.id}
              onClick={() => stepPlayerSettings(-1)}>{t("lifeTracker.previousPlayer")}</Button>
            <Button onClick={() => stepPlayerSettings(1)}>
              {t(playerSettingsId === activePlayers.at(-1)?.id ? "lifeTracker.finishPlayerSetup" : "lifeTracker.nextPlayer")}
            </Button>
          </Group>
        </Stack>}
      </Modal>

      <CameraModal
        target={cameraTarget}
        onClose={() => setCameraTarget(null)}
        onCapture={(dataUrl) => {
          if (cameraTarget) setPhoto(cameraTarget.playerId, cameraTarget.slot, dataUrl);
        }}
      />
      </div>
    </div>
  );
}
