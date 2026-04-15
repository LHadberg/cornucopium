import { mtgRouter } from "~/server/api/routers/mtg";
import { diceRouter } from "~/server/api/routers/dice";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  mtg: mtgRouter,
  dice: diceRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.mtg.getSelections();
 *       ^? CommanderSelection[]
 */
export const createCaller = createCallerFactory(appRouter);
