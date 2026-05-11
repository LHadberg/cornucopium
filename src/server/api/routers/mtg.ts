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

export const VALID_TAGS = [
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
] as const;

export const VALID_ARCHETYPES = [
  "Aggro", "Combo", "Control", "Midrange", "Stax", "Tempo", "Vorthos",
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
  commanderPreferredPrintBackImage: scryfallImageUrl,
  commanderPreferredPrintBackArt: scryfallImageUrl,
  partnerPreferredPrintId: z.string().max(64).nullable(),
  partnerPreferredPrintImage: scryfallImageUrl,
  partnerPreferredPrintArt: scryfallImageUrl,
  partnerPreferredPrintBackImage: scryfallImageUrl,
  partnerPreferredPrintBackArt: scryfallImageUrl,
  companionScryfallId: z.string().max(64).nullable(),
  companionName: z.string().max(200).nullable(),
  companionTypeLine: z.string().max(200).nullable(),
  companionImage: scryfallImageUrl,
  companionArtCrop: scryfallImageUrl,
  companionPreferredPrintId: z.string().max(64).nullable(),
  companionPreferredPrintImage: scryfallImageUrl,
  companionPreferredPrintArt: scryfallImageUrl,
  companionPreferredPrintBackImage: scryfallImageUrl,
  companionPreferredPrintBackArt: scryfallImageUrl,
});

// ── Router ────────────────────────────────────────────────────────────────────

export const mtgRouter = createTRPCRouter({
  getSelections: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.deck.findMany({
      where: { userId: ctx.session.user.id, isActiveSelection: true },
    });
  }),

  upsertSelection: protectedProcedure
    .input(selectionInput)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...rest } = input;
      const data = { ...rest, tags: JSON.stringify(tags), userId: ctx.session.user.id, isActiveSelection: true };
      const existing = await ctx.db.deck.findFirst({
        where: { userId: ctx.session.user.id, colorId: input.colorId, isActiveSelection: true },
        select: { id: true },
      });
      if (existing) {
        return ctx.db.deck.update({ where: { id: existing.id }, data });
      }
      return ctx.db.deck.create({ data });
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
