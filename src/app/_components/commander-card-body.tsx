"use client";

import { Badge, Group, HoverCard, Image, Skeleton, Stack, Text } from "@mantine/core";
import { IconFlipVertical, IconRotate2 } from "@tabler/icons-react";
import { useState } from "react";

export const COLOR_MAP: Record<string, { bg: string; border: string }> = {
  W: { bg: "#f5f0e8", border: "#c8b87a" },
  U: { bg: "#1a6fac", border: "#0d4f8a" },
  B: { bg: "#0a0a0a", border: "#3a3a3a" },
  R: { bg: "#d44026", border: "#a03020" },
  G: { bg: "#2d7a3a", border: "#1a5227" },
};

export const COLOR_COMBINATIONS = [
  { id: "w",     name: "White",     colors: ["W"] },
  { id: "u",     name: "Blue",      colors: ["U"] },
  { id: "b",     name: "Black",     colors: ["B"] },
  { id: "r",     name: "Red",       colors: ["R"] },
  { id: "g",     name: "Green",     colors: ["G"] },
  { id: "wu",    name: "Azorius",   colors: ["W", "U"] },
  { id: "wb",    name: "Orzhov",    colors: ["W", "B"] },
  { id: "wr",    name: "Boros",     colors: ["W", "R"] },
  { id: "wg",    name: "Selesnya",  colors: ["W", "G"] },
  { id: "ub",    name: "Dimir",     colors: ["U", "B"] },
  { id: "ur",    name: "Izzet",     colors: ["U", "R"] },
  { id: "ug",    name: "Simic",     colors: ["U", "G"] },
  { id: "br",    name: "Rakdos",    colors: ["B", "R"] },
  { id: "bg",    name: "Golgari",   colors: ["B", "G"] },
  { id: "rg",    name: "Gruul",     colors: ["R", "G"] },
  { id: "wub",   name: "Esper",     colors: ["W", "U", "B"] },
  { id: "wur",   name: "Jeskai",    colors: ["W", "U", "R"] },
  { id: "wug",   name: "Bant",      colors: ["W", "U", "G"] },
  { id: "wbr",   name: "Mardu",     colors: ["W", "B", "R"] },
  { id: "wbg",   name: "Abzan",     colors: ["W", "B", "G"] },
  { id: "wrg",   name: "Naya",      colors: ["W", "R", "G"] },
  { id: "ubr",   name: "Grixis",    colors: ["U", "B", "R"] },
  { id: "ubg",   name: "Sultai",    colors: ["U", "B", "G"] },
  { id: "urg",   name: "Temur",     colors: ["U", "R", "G"] },
  { id: "brg",   name: "Jund",      colors: ["B", "R", "G"] },
  { id: "wubr",  name: "Non-Green", colors: ["W", "U", "B", "R"] },
  { id: "wubg",  name: "Non-Red",   colors: ["W", "U", "B", "G"] },
  { id: "wurg",  name: "Non-Black", colors: ["W", "U", "R", "G"] },
  { id: "wbrg",  name: "Non-Blue",  colors: ["W", "B", "R", "G"] },
  { id: "ubrg",  name: "Non-White", colors: ["U", "B", "R", "G"] },
  { id: "wubrg", name: "Five-Color",colors: ["W", "U", "B", "R", "G"] },
  { id: "c",     name: "Colorless", colors: [] },
];

export function ManaSymbol({ color }: { color: string }) {
  const s = COLOR_MAP[color];
  if (!s) return null;
  return (
    <div style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, background: s.bg, border: `2px solid ${s.border}` }} />
  );
}

export function ColorlessSymbol() {
  return (
    <div style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, background: "#aaa", border: "2px solid #888" }} />
  );
}

export function GlimmerSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
      <path d="M9 1L10.6 7.4L17 9L10.6 10.6L9 17L7.4 10.6L1 9L7.4 7.4Z" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      <path d="M14.5 2L15.2 4.8L18 5.5L15.2 6.2L14.5 9L13.8 6.2L11 5.5L13.8 4.8Z" fill="#FFD700" opacity="0.75" />
      <path d="M3.5 11L4 12.9L6 13.4L4 13.9L3.5 15.8L3 13.9L1 13.4L3 12.9Z" fill="#FFD700" opacity="0.6" />
    </svg>
  );
}

export function ArtImage({
  artCrop, normal, name, flex, half,
  onGlimmerClick, backNormal, backArtCrop, canFlip,
  tooltipSide = "right",
}: {
  artCrop: string; normal: string; name: string; flex?: string; half?: "left" | "right";
  onGlimmerClick?: () => void;
  backNormal?: string | null; backArtCrop?: string | null; canFlip?: boolean;
  tooltipSide?: "left" | "right" | "bottom";
}) {
  const [hovered, setHovered] = useState(false);
  const [hoverKey, setHoverKey] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const displayNormal = showBack && backNormal ? backNormal : normal;

  const wrapperStyle: React.CSSProperties = half
    ? {
        flex: "0 0 calc(50% - 2px)", overflow: "hidden", minWidth: 0, position: "relative",
        cursor: "default", aspectRatio: "313/457",
        borderRadius: half === "left"
          ? "var(--mantine-radius-sm) 0 0 var(--mantine-radius-sm)"
          : "0 var(--mantine-radius-sm) var(--mantine-radius-sm) 0",
      }
    : { flex: flex ?? "1 1 100%", minWidth: 0, position: "relative", cursor: "default" };

  return (
    <HoverCard key={hoverKey} width="auto" position={tooltipSide} openDelay={300} closeDelay={150} withinPortal middlewares={{ flip: true, shift: true }}>
      <HoverCard.Target>
        <div style={wrapperStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          {half ? (
            <Image src={artCrop} alt={name} radius={0} loading="lazy"
              style={{ width: "200%", maxWidth: "none", marginLeft: "-50%", display: "block", aspectRatio: "626/457", objectFit: "cover" }}
            />
          ) : (
            <Image src={artCrop} alt={name} radius="sm" loading="lazy"
              style={{ display: "block", aspectRatio: "626/457", objectFit: "cover", width: "100%" }}
            />
          )}
          {onGlimmerClick && hovered && (
            <button
              className="art-glimmer-btn"
              style={{ position: "absolute", bottom: 4, right: 4, zIndex: 1 }}
              onClick={(e) => { e.stopPropagation(); setHoverKey((k) => k + 1); onGlimmerClick(); }}
              title="Select art version"
            >
              <GlimmerSvg />
            </button>
          )}
        </div>
      </HoverCard.Target>
      <HoverCard.Dropdown p={4}>
        <div style={{ position: "relative" }}>
          <Image src={displayNormal} alt={name} radius={20} loading="lazy"
            style={{ maxWidth: "min(260px, calc(100vw - 16px))", width: "100%", transform: flipped ? "rotate(180deg)" : undefined }}
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

export interface CommanderCardBodyProps {
  commanderName: string | null;
  commanderArtCrop?: string | null;
  commanderImage?: string | null;
  commanderBackNormal?: string | null;
  commanderBackArtCrop?: string | null;
  commanderCanFlip?: boolean;
  onCommanderGlimmerClick?: () => void;

  partnerName?: string | null;
  partnerLabel?: string | null;
  partnerArtCrop?: string | null;
  partnerImage?: string | null;
  partnerBackNormal?: string | null;
  partnerBackArtCrop?: string | null;
  partnerCanFlip?: boolean;
  onPartnerGlimmerClick?: () => void;

  companionName?: string | null;
  companionArtCrop?: string | null;
  companionImage?: string | null;
  companionBackNormal?: string | null;
  companionBackArtCrop?: string | null;
  companionCanFlip?: boolean;
  onCompanionGlimmerClick?: () => void;

  bracketLabel?: string | null;
  displayTag?: string | null;
  archetype?: string | null;

  visual?: boolean;
  isLoading?: boolean;
  tooltipSide?: "left" | "right" | "bottom";
  emptyText?: string;
  hideCommanderName?: boolean;
}

export function CommanderCardBody({
  commanderName, commanderArtCrop, commanderImage,
  commanderBackNormal, commanderBackArtCrop, commanderCanFlip, onCommanderGlimmerClick,
  partnerName, partnerLabel, partnerArtCrop, partnerImage,
  partnerBackNormal, partnerBackArtCrop, partnerCanFlip, onPartnerGlimmerClick,
  companionName, companionArtCrop, companionImage,
  companionBackNormal, companionBackArtCrop, companionCanFlip, onCompanionGlimmerClick,
  bracketLabel, displayTag, archetype,
  visual = true, isLoading = false, tooltipSide = "right",
  emptyText = "No commander selected",
  hideCommanderName = false,
}: CommanderCardBodyProps) {
  if (isLoading) {
    return (
      <Stack gap={6} mt={4}>
        <Skeleton height={11} width="70%" radius="sm" />
        <Skeleton height={9} width="45%" radius="sm" />
      </Stack>
    );
  }

  if (!commanderName) {
    return <Text size="xs" c="dimmed">{emptyText}</Text>;
  }

  const badges = (
    <>
      {bracketLabel && <Badge size="xs" variant="filled" color="blue">{bracketLabel}</Badge>}
      {displayTag && <Badge size="xs" variant="filled" color="yellow">{displayTag}</Badge>}
      {archetype && <Badge size="xs" variant="filled" color="grape">{archetype}</Badge>}
    </>
  );

  const textBlock = (
    <div style={{ minHeight: visual ? 60 : undefined, display: "flex", flexDirection: "column", gap: 4 }}>
      {!hideCommanderName && <Text size="xs" fw={500} lineClamp={1}>{commanderName}</Text>}
      {partnerName && (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {partnerLabel ? `${partnerLabel}: ` : "+ "}{partnerName}
        </Text>
      )}
      <Group gap={4} wrap="wrap">{badges}</Group>
    </div>
  );

  if (visual) {
    return (
      <Stack gap={4}>
        {textBlock}
        {commanderArtCrop && commanderImage && (
          <Group gap={4} wrap="nowrap" align="flex-start">
            <ArtImage
              artCrop={commanderArtCrop} normal={commanderImage} name={commanderName}
              half={partnerArtCrop ? "left" : undefined} flex="1 1 100%"
              onGlimmerClick={onCommanderGlimmerClick}
              backNormal={commanderBackNormal} backArtCrop={commanderBackArtCrop}
              canFlip={commanderCanFlip} tooltipSide={tooltipSide}
            />
            {partnerArtCrop && partnerImage && (
              <ArtImage
                artCrop={partnerArtCrop} normal={partnerImage} name={partnerName ?? "Partner"}
                half="right"
                onGlimmerClick={onPartnerGlimmerClick}
                backNormal={partnerBackNormal} backArtCrop={partnerBackArtCrop}
                canFlip={partnerCanFlip} tooltipSide={tooltipSide}
              />
            )}
          </Group>
        )}
        {companionArtCrop && companionImage && (
          <ArtImage
            artCrop={companionArtCrop} normal={companionImage} name={companionName ?? "Companion"}
            flex="1 1 100%"
            onGlimmerClick={onCompanionGlimmerClick}
            backNormal={companionBackNormal} backArtCrop={companionBackArtCrop}
            canFlip={companionCanFlip} tooltipSide={tooltipSide}
          />
        )}
      </Stack>
    );
  }

  // Condensed mode — wrap text in a hover card showing the full card image
  return (
    <HoverCard width="auto" position={tooltipSide} openDelay={400} closeDelay={0} disabled={!commanderImage} withinPortal middlewares={{ flip: true, shift: true }}>
      <HoverCard.Target>
        <Stack gap={4}>{textBlock}</Stack>
      </HoverCard.Target>
      {commanderImage && (
        <HoverCard.Dropdown p={4}>
          <Image src={commanderImage} alt={commanderName} radius={20} loading="lazy"
            style={{ maxWidth: "min(250px, calc(100vw - 16px))", width: "100%" }}
          />
        </HoverCard.Dropdown>
      )}
    </HoverCard>
  );
}
