import { IconCards, IconDice, IconHeart, IconLayoutGrid, IconMapRoute } from "@tabler/icons-react";

// Add a tool here to include it on the home page.
export const tools = [
  { id: "life", title: "Life Tracker", category: "Magic", href: "/life-tracker", icon: IconHeart, color: "#cc533f", short: "Keep the whole table in play.", description: "Multiplayer life totals and damage tracking, together on one screen.", action: "Start a game", auth: false },
  { id: "collection", title: "MTG Complete", category: "Magic", href: "/mtg-complete", icon: IconCards, color: "#7560b0", short: "Every color. Your collection.", description: "Build and share your Commander collection across all 32 color combinations.", action: "Your collection", auth: true, example: "/mtg-complete/Lasses-liste" },
  { id: "decks", title: "Decks", category: "Magic", href: "/decks", icon: IconLayoutGrid, color: "#bd7934", short: "Your decks, all in one place.", description: "Browse and manage your Commander decks in a single grid.", action: "Browse your decks", auth: true },
  { id: "dice", title: "Dice Roller", category: "Roleplaying", href: "/dice-roller", icon: IconDice, color: "#4e75bd", short: "Leave a little to chance.", description: "3D physics dice with custom sets, actions, and stat modifiers.", action: "Roll some dice", auth: false },
  { id: "hiking", title: "Hiking", category: "Outdoors", href: "/hiking", icon: IconMapRoute, color: "#477c5b", short: "Take the long way home.", description: "Plan waypoints, check distance and elevation, and export your route to GPX.", action: "Plan a hike", auth: false },
];
export type Tool = (typeof tools)[number];

