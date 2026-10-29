import { IconCards, IconDice, IconHeart, IconLayoutGrid, IconMapRoute } from "@tabler/icons-react";

// Add a tool here and its home.tools translations in both locales.
export const tools = [
  { id: "life", category: "magic", href: "/life-tracker", icon: IconHeart, color: "#cc533f", auth: false },
  { id: "collection", category: "magic", href: "/mtg-complete", icon: IconCards, color: "#7560b0", auth: true, example: "/mtg-complete/Lasses-liste" },
  { id: "decks", category: "magic", href: "/decks", icon: IconLayoutGrid, color: "#bd7934", auth: true },
  { id: "dice", category: "roleplaying", href: "/dice-roller", icon: IconDice, color: "#4e75bd", auth: false },
  { id: "hiking", category: "outdoors", href: "/hiking", icon: IconMapRoute, color: "#477c5b", auth: false },
];
export type Tool = (typeof tools)[number];

