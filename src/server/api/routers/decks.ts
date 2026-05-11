import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VALID_TAGS, VALID_ARCHETYPES } from "./mtg";

const scryfallImageUrl = z
  .string()
  .max(512)
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && parsed.hostname === "cards.scryfall.io";
    } catch { return false; }
  }, "Image URL must be from cards.scryfall.io")
  .nullable();

const deckListUrlSchema = z
  .string()
  .max(2048)
  .refine((url) => {
    try {
      const { protocol } = new URL(url);
      return protocol === "http:" || protocol === "https:";
    } catch { return false; }
  }, "Deck list URL must be a valid http(s) URL")
  .nullable();

const deckInput = z.object({
  name: z.string().max(200).nullable(),
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
  companionScryfallId: z.string().max(64).nullable(),
  companionName: z.string().max(200).nullable(),
  companionTypeLine: z.string().max(200).nullable(),
  companionImage: scryfallImageUrl,
  companionArtCrop: scryfallImageUrl,
  bracket: z.enum(["1", "2", "3", "4", "5"]).nullable(),
  tags: z.array(z.enum(VALID_TAGS)).max(VALID_TAGS.length),
  favoriteTag: z.enum(VALID_TAGS).nullable(),
  archetype: z.enum(VALID_ARCHETYPES).nullable(),
  deckListUrl: deckListUrlSchema,
  colorId: z.string().max(10).nullable(),
});

export const decksRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.deck.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(deckInput)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...rest } = input;
      return ctx.db.deck.create({
        data: { ...rest, tags: JSON.stringify(tags), userId: ctx.session.user.id },
      });
    }),

  update: protectedProcedure
    .input(deckInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...rest } = input;
      return ctx.db.deck.updateMany({
        where: { id, userId: ctx.session.user.id },
        data: { ...rest, tags: JSON.stringify(tags) },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deck.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),

  setAsActiveSelection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deck = await ctx.db.deck.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true, colorId: true },
      });
      if (!deck) throw new TRPCError({ code: "NOT_FOUND" });
      if (!deck.colorId) throw new TRPCError({ code: "BAD_REQUEST", message: "Deck must have a colorId to be set as active selection" });

      await ctx.db.deck.updateMany({
        where: { userId: ctx.session.user.id, colorId: deck.colorId, isActiveSelection: true },
        data: { isActiveSelection: false },
      });
      return ctx.db.deck.update({
        where: { id: input.id },
        data: { isActiveSelection: true },
      });
    }),

  getImportPromptStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { deckListImportPromptSeen: true },
    });
    return { seen: user?.deckListImportPromptSeen ?? false };
  }),

  markImportPromptSeen: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: { deckListImportPromptSeen: true },
    });
  }),

  importFromMtgComplete: protectedProcedure
    .input(z.object({ colorIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const selections = await ctx.db.deck.findMany({
        where: { userId: ctx.session.user.id, isActiveSelection: true, colorId: { in: input.colorIds } },
      });

      const created = await Promise.all(
        selections.map((s) =>
          ctx.db.deck.create({
            data: {
              userId: ctx.session.user.id,
              name: s.commanderName,
              colorId: s.colorId,
              isActiveSelection: false,
              commanderScryfallId: s.commanderScryfallId,
              commanderName: s.commanderName,
              commanderTypeLine: s.commanderTypeLine,
              commanderImage: s.commanderPreferredPrintImage ?? s.commanderImage,
              commanderArtCrop: s.commanderPreferredPrintArt ?? s.commanderArtCrop,
              partnerScryfallId: s.partnerScryfallId,
              partnerName: s.partnerName,
              partnerTypeLine: s.partnerTypeLine,
              partnerImage: s.partnerPreferredPrintImage ?? s.partnerImage,
              partnerArtCrop: s.partnerPreferredPrintArt ?? s.partnerArtCrop,
              partnerType: s.partnerType,
              companionScryfallId: s.companionScryfallId,
              companionName: s.companionName,
              companionTypeLine: s.companionTypeLine,
              companionImage: s.companionPreferredPrintImage ?? s.companionImage,
              companionArtCrop: s.companionPreferredPrintArt ?? s.companionArtCrop,
              bracket: s.bracket,
              tags: s.tags,
              favoriteTag: s.favoriteTag,
              archetype: s.archetype,
              deckListUrl: s.deckListUrl,
            },
          }),
        ),
      );

      return { count: created.length };
    }),
});
