import { z } from "zod";

export const GAME_STORAGE_KEY = "life-tracker-game-v1";
const count = z.number().int().nonnegative();
const focus = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });
const player = z.object({
  id: z.number().int().min(0).max(3),
  name: z.string(),
  life: z.number().int(),
  color: z.string(),
  photos: z.object({ resting: z.string().nullable(), damage: z.string().nullable() }),
  photoFocus: z.object({ resting: focus, damage: focus }),
  photoFit: z.enum(["cover", "contain"]).default("cover"),
  counters: z.object({ poison: count, energy: count, experience: count, tax: count, partnerTax: count.default(0), speed: count.max(4).default(0) }),
  counterToggles: z.object({ poison: z.boolean(), energy: z.boolean(), experience: z.boolean(), tax: z.boolean(), speed: z.boolean().default(false) }),
  partnerCommanders: z.boolean(),
  commanderDamage: z.record(z.string().regex(/^[0-7]$/), count),
});

export const savedGameSchema = z.object({
  version: z.literal(1),
  players: z.array(player).length(4).refine((players) => players.every((player, index) => player.id === index)),
  playerCount: z.number().int().min(2).max(4),
  startingLife: z.union([z.literal(20), z.literal(40)]),
  orientationMode: z.enum(["outward", "down", "roundtable"]),
  theme: z.enum(["A", "B", "D"]),
  starter: z.string().nullable(),
  starterId: z.number().int().nullable().optional(),
  monarchEnabled: z.boolean().default(false),
  monarchId: z.number().int().min(0).max(3).nullable().default(null),
});
