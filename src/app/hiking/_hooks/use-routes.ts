import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import type { LatLng, RouteSegment, SavedRoute, Waypoint } from "../_types/types";

const STORAGE_KEY = "hiking-routes";

type StoredRoute = Omit<SavedRoute, "routeSegments" | "waypoints" | "routeWaypointDistancesKm"> & {
  routeSegments?: RouteSegment[];
  routeWaypointDistancesKm?: number[];
  waypoints: Array<LatLng | Waypoint>;
};

function distanceKm(a: LatLng, b: LatLng) {
  const radiusKm = 6371;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function withWaypointNames(waypoints: Array<LatLng | Waypoint>): Waypoint[] {
  return waypoints.map((waypoint, index) => ({
    ...waypoint,
    name: "name" in waypoint && waypoint.name ? waypoint.name : index === 0 ? "Start" : `Stop ${index}`,
    elevationM: "elevationM" in waypoint ? waypoint.elevationM ?? null : null,
  }));
}

function withWaypointDistances(route: StoredRoute, waypoints: Waypoint[]) {
  if (route.routeWaypointDistancesKm?.length === waypoints.length) {
    return route.routeWaypointDistancesKm;
  }

  return waypoints.reduce<number[]>((distances, waypoint, index) => {
    if (index === 0) return [0];
    return [...distances, distances[index - 1]! + distanceKm(waypoints[index - 1]!, waypoint)];
  }, []);
}

function withRouteSegments(route: StoredRoute): SavedRoute {
  const waypoints = withWaypointNames(route.waypoints);
  return {
    ...route,
    waypoints,
    routeSegments: route.routeSegments ?? [{ coords: route.routeCoords, type: "road" }],
    routeWaypointDistancesKm: withWaypointDistances(route, waypoints),
  };
}

function loadLocalRoutes(): SavedRoute[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredRoute[];
    return stored.map(withRouteSegments);
  } catch {
    return [];
  }
}

function persistLocal(routes: SavedRoute[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function useRoutes() {
  const { status } = useSession();
  const [localRoutes, setLocalRoutes] = useState<SavedRoute[]>([]);
  const utils = api.useUtils();
  const isAuthenticated = status === "authenticated";
  const remoteRoutesQuery = api.hiking.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const saveRemoteRoute = api.hiking.save.useMutation({
    onSuccess: async () => {
      await utils.hiking.list.invalidate();
    },
  });
  const deleteRemoteRoute = api.hiking.delete.useMutation({
    onSuccess: async () => {
      await utils.hiking.list.invalidate();
    },
  });

  useEffect(() => {
    setLocalRoutes(loadLocalRoutes());
  }, []);

  const routes = useMemo(
    () => (isAuthenticated ? remoteRoutesQuery.data ?? [] : localRoutes),
    [isAuthenticated, localRoutes, remoteRoutesQuery.data],
  );

  const saveRoute = useCallback(
    (
      name: string,
      waypoints: Waypoint[],
      routeCoords: LatLng[],
      routeSegments: RouteSegment[],
      routeWaypointDistancesKm: number[],
      distanceKm: number,
      existingId?: string,
      existingCreatedAt?: string,
    ) => {
      const route: SavedRoute = {
        id: existingId ?? crypto.randomUUID(),
        name,
        waypoints,
        routeCoords,
        routeSegments,
        routeWaypointDistancesKm,
        distanceKm,
        createdAt: existingCreatedAt ?? new Date().toISOString(),
      };

      if (isAuthenticated) {
        saveRemoteRoute.mutate(route);
      } else {
        setLocalRoutes((prev) => {
          const exists = prev.some((r) => r.id === route.id);
          const next = exists
            ? prev.map((r) => (r.id === route.id ? route : r))
            : [...prev, route];
          persistLocal(next);
          return next;
        });
      }

      return route;
    },
    [isAuthenticated, saveRemoteRoute],
  );

  const deleteRoute = useCallback(
    (id: string) => {
      if (isAuthenticated) {
        deleteRemoteRoute.mutate({ id });
        return;
      }

      setLocalRoutes((prev) => {
        const next = prev.filter((route) => route.id !== id);
        persistLocal(next);
        return next;
      });
    },
    [deleteRemoteRoute, isAuthenticated],
  );

  return {
    routes,
    saveRoute,
    deleteRoute,
    loading: isAuthenticated && remoteRoutesQuery.isLoading,
    persistence: isAuthenticated ? ("database" as const) : ("browser" as const),
  };
}
