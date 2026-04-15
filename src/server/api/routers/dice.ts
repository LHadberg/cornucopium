import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const diceRouter = createTRPCRouter({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        diceRollerStats: true,
        diceRollerActionSets: true,
        diceRollerSelectedActionSet: true,
        diceRollerPhysics: true,
        diceRollerVisuals: true,
      },
    });
    return user ?? null;
  }),

  saveConfig: protectedProcedure
    .input(z.object({
      stats: z.string().optional(),
      actionSets: z.string().optional(),
      selectedActionSet: z.string().nullable().optional(),
      physics: z.string().optional(),
      visuals: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          ...(input.stats !== undefined && { diceRollerStats: input.stats }),
          ...(input.actionSets !== undefined && { diceRollerActionSets: input.actionSets }),
          ...(input.selectedActionSet !== undefined && { diceRollerSelectedActionSet: input.selectedActionSet }),
          ...(input.physics !== undefined && { diceRollerPhysics: input.physics }),
          ...(input.visuals !== undefined && { diceRollerVisuals: input.visuals }),
        },
      });
    }),
});
