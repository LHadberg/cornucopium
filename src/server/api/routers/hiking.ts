import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const latLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const waypointSchema = latLngSchema.extend({
  name: z.string(),
  elevationM: z.number().nullable(),
});

const routeSegmentSchema = z.object({
  coords: z.array(latLngSchema),
  type: z.enum(["road", "path", "track", "walkway", "steps"]),
});

const savedRouteSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  waypoints: z.array(waypointSchema).min(2),
  routeCoords: z.array(latLngSchema).min(2),
  routeSegments: z.array(routeSegmentSchema),
  routeWaypointDistancesKm: z.array(z.number()),
  distanceKm: z.number().nonnegative(),
  createdAt: z.string(),
});

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const hikingRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.hikingMapData.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      waypoints: parseJson(row.waypoints, []),
      routeCoords: parseJson(row.routeCoords, []),
      routeSegments: parseJson(row.routeSegments, []),
      routeWaypointDistancesKm: parseJson(row.routeWaypointDistancesKm, []),
      distanceKm: row.distanceKm,
      createdAt: row.createdAt.toISOString(),
    }));
  }),

  save: protectedProcedure
    .input(savedRouteSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hikingMapData.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          userId: ctx.session.user.id,
          name: input.name,
          waypoints: JSON.stringify(input.waypoints),
          routeCoords: JSON.stringify(input.routeCoords),
          routeSegments: JSON.stringify(input.routeSegments),
          routeWaypointDistancesKm: JSON.stringify(input.routeWaypointDistancesKm),
          distanceKm: input.distanceKm,
          createdAt: new Date(input.createdAt),
        },
        update: {
          name: input.name,
          waypoints: JSON.stringify(input.waypoints),
          routeCoords: JSON.stringify(input.routeCoords),
          routeSegments: JSON.stringify(input.routeSegments),
          routeWaypointDistancesKm: JSON.stringify(input.routeWaypointDistancesKm),
          distanceKm: input.distanceKm,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.hikingMapData.deleteMany({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),
});
