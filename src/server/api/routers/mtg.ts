import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { nameGenLimiter } from "~/server/ratelimit";

// ── Shared enums (kept in sync with client constants) ─────────────────────────

const VALID_COLOR_IDS = [
  "w", "u", "b", "r", "g",
  "wu", "wb", "wr", "wg", "ub", "ur", "ug", "br", "bg", "rg",
  "wub", "wur", "wug", "wbr", "wbg", "wrg", "ubr", "ubg", "urg", "brg",
  "wubr", "wubg", "wurg", "wbrg", "ubrg",
  "wubrg", "c",
] as const;

const VALID_TAGS = [
  "Aristocrats", "Enchantress", "Extra Turns", "Group Hug", "Hatebears",
  "Infect", "Landfall", "Mill", "Pillowfort", "Politics", "Ramp",
  "Reanimator", "Spellslinger", "Storm", "Superfriends", "Tokens", "Tribal", "Voltron",
] as const;

const VALID_ARCHETYPES = [
  "Aggro", "Combo", "Control", "Midrange", "Stax", "Tempo",
] as const;

// ── Validation helpers ────────────────────────────────────────────────────────

/**
 * Accepts only https://cards.scryfall.io/... image URLs.
 * Prevents storing arbitrary URLs in image fields that are later rendered as <img> sources.
 */
const scryfallImageUrl = z
  .string()
  .max(512, "Image URL too long")
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && parsed.hostname === "cards.scryfall.io";
      } catch {
        return false;
      }
    },
    "Image URL must be from cards.scryfall.io",
  )
  .nullable();

/**
 * Deck list URL: must be a valid http(s) URL.
 * Prevents javascript: / data: URIs from being stored and later rendered in href attributes.
 */
const deckListUrlSchema = z
  .string()
  .max(2048, "URL too long")
  .refine(
    (url) => {
      try {
        const { protocol } = new URL(url);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    "Deck list URL must be a valid http(s) URL",
  )
  .nullable();

/**
 * Shared page name schema.
 * - Length: 2–32 characters after trimming (DoS prevention)
 * - Allowed: letters, digits, hyphens, apostrophes
 *   (excludes all HTML/script/SQL special characters)
 */
const PAGE_NAME_SCHEMA = z
  .string()
  .max(64, "Name is too long")
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(32, "Name must be at most 32 characters")
      .regex(
        /^[a-zA-Z0-9'\-]+$/,
        "Only letters, numbers, hyphens, and apostrophes are allowed (no spaces)",
      ),
  );

// ── Name generation word lists ────────────────────────────────────────────────

const ADJECTIVES = [
  "Ancient", "Arcane", "Blazing", "Crimson", "Dark", "Dread", "Elder",
  "Eternal", "Fabled", "Frost", "Gilded", "Hollow", "Iron", "Jade",
  "Lost", "Nether", "Obsidian", "Primal", "Radiant", "Shadow",
  "Silver", "Storm", "Twilight", "Void", "Wild",
];

const NOUNS = [
  "Angel", "Artificer", "Berserker", "Cyclops", "Dragon", "Drake",
  "Druid", "Elemental", "Elf", "Goblin", "Griffin", "Hydra",
  "Knight", "Lich", "Merfolk", "Monk", "Ogre", "Phoenix",
  "Raven", "Shaman", "Sphinx", "Vampire", "Warrior", "Wizard", "Wurm",
];

// ── Selection input schema ────────────────────────────────────────────────────

const selectionInput = z.object({
  colorId: z.enum(VALID_COLOR_IDS),
  commanderScryfallId: z.string().max(64).nullable(),
  commanderName: z.string().max(200).nullable(),
  commanderTypeLine: z.string().max(200).nullable(),
  commanderImage: scryfallImageUrl,
  commanderArtCrop: scryfallImageUrl,
  partnerScryfallId: z.string().max(64).nullable(),
  partnerName: z.string().max(200).nullable(),
  partnerTypeLine: z.string().max(200).nullable(),
  partnerImage: scryfallImageUrl,
  partnerArtCrop: scryfallImageUrl,
  partnerType: z.enum(["partner", "partner-with", "background"]).nullable(),
  bracket: z.enum(["1", "2", "3", "4", "5"]).nullable(),
  tags: z.array(z.enum(VALID_TAGS)).max(VALID_TAGS.length),
  favoriteTag: z.enum(VALID_TAGS).nullable(),
  archetype: z.enum(VALID_ARCHETYPES).nullable(),
  deckListUrl: deckListUrlSchema,
  commanderPreferredPrintId: z.string().max(64).nullable(),
  commanderPreferredPrintImage: scryfallImageUrl,
  commanderPreferredPrintArt: scryfallImageUrl,
  partnerPreferredPrintId: z.string().max(64).nullable(),
  partnerPreferredPrintImage: scryfallImageUrl,
  partnerPreferredPrintArt: scryfallImageUrl,
});

// ── Router ────────────────────────────────────────────────────────────────────

export const mtgRouter = createTRPCRouter({
  getSelections: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.commanderSelection.findMany({
      where: { userId: ctx.session.user.id },
    });
  }),

  upsertSelection: protectedProcedure
    .input(selectionInput)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...rest } = input;
      const data = { ...rest, tags: JSON.stringify(tags), userId: ctx.session.user.id };
      return ctx.db.commanderSelection.upsert({
        where: { userId_colorId: { userId: ctx.session.user.id, colorId: input.colorId } },
        create: data,
        update: data,
      });
    }),

  /** Returns the current user's public-page settings. */
  getPageVisibility: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { mtgPagePublic: true, mtgPageName: true },
    });
    return { isPublic: user?.mtgPagePublic ?? false, name: user?.mtgPageName ?? null };
  }),

  /**
   * Sets the public/private state.
   * When isPublic=true, a valid unique name is required.
   * When isPublic=false, the stored name is preserved for next time.
   */
  setPageVisibility: protectedProcedure
    .input(
      z.object({
        isPublic: z.boolean(),
        name: PAGE_NAME_SCHEMA.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.isPublic && !input.name) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Name is required when making page public" });
      }

      if (input.isPublic && input.name) {
        const taken = await ctx.db.user.findFirst({
          where: {
            mtgPagePublic: true,
            mtgPageName: input.name,
            NOT: { id: ctx.session.user.id },
          },
        });
        if (taken) {
          throw new TRPCError({ code: "CONFLICT", message: "That name is already taken" });
        }
      }

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          mtgPagePublic: input.isPublic,
          ...(input.name !== undefined ? { mtgPageName: input.name } : {}),
        },
      });

      return { isPublic: input.isPublic };
    }),

  /**
   * Checks whether a given page name is available among currently-public users.
   * Uses a loose max-length on raw input to prevent DoS before parsing.
   */
  checkPageName: protectedProcedure
    .input(z.object({ name: z.string().max(128) }))
    .query(async ({ ctx, input }) => {
      const parsed = PAGE_NAME_SCHEMA.safeParse(input.name);
      if (!parsed.success) {
        return { available: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
      }
      const taken = await ctx.db.user.findFirst({
        where: {
          mtgPagePublic: true,
          mtgPageName: parsed.data,
          NOT: { id: ctx.session.user.id },
        },
      });
      return { available: !taken, error: taken ? "Name already taken" : null };
    }),

  /**
   * Generates a unique MTG-flavoured name whose numeric suffix does not
   * collide with any existing public page name.
   * Hard-limited to 5 calls per hour per user via Upstash.
   */
  generatePageName: protectedProcedure.mutation(async ({ ctx }) => {
    if (nameGenLimiter) {
      const { success } = await nameGenLimiter.limit(ctx.session.user.id);
      if (!success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many name generation requests, please try again later.",
        });
      }
    }

    const publicNames = await ctx.db.user.findMany({
      where: { mtgPagePublic: true, mtgPageName: { not: null } },
      select: { mtgPageName: true },
    });

    const usedNumbers = new Set(
      publicNames
        .map((u) => {
          const m = u.mtgPageName?.match(/(\d+)$/);
          return m ? parseInt(m[1]!, 10) : null;
        })
        .filter((n): n is number => n !== null),
    );

    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]!;
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]!;

    let num = Math.floor(Math.random() * 9000) + 1000;
    let attempts = 0;
    while (usedNumbers.has(num) && attempts < 200) {
      num = Math.floor(Math.random() * 9000) + 1000;
      attempts++;
    }

    return `${adj}${noun}${num}`;
  }),
});
