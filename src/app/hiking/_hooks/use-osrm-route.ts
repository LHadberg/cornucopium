import { useCallback, useState } from "react";
import type { LatLng, RouteSegment } from "../_types/types";

interface RouteResult {
  coords: LatLng[];
  segments: RouteSegment[];
  distanceKm: number;
  waypointDistancesKm: number[];
}

interface ValhallaManeuver {
  begin_shape_index: number;
  end_shape_index: number;
  instruction?: string;
  street_names?: string[];
}

interface ValhallaLeg {
  maneuvers: ValhallaManeuver[];
  shape: string;
  summary: {
    has_highway?: boolean;
    length: number;
  };
}

interface ValhallaRoute {
  trip?: {
    legs?: ValhallaLeg[];
    summary?: {
      has_highway?: boolean;
      length: number;
    };
  };
  error?: string;
  status_message?: string;
}

const VALHALLA_ROUTE_URL = "https://valhalla1.openstreetmap.de/route";

function decodeLine(encoded: string, precision = 6): LatLng[] {
  const factor = Math.pow(10, precision);
  const coords: LatLng[] = [];
  let lat = 0;
  let lng = 0;
  let i = 0;

  while (i < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ lat: lat / factor, lng: lng / factor });
  }

  return coords;
}

function isPathManeuver(maneuver: ValhallaManeuver): boolean {
  const instruction = maneuver.instruction?.toLowerCase() ?? "";
  const hasStreetName = (maneuver.street_names?.length ?? 0) > 0;

  return (
    !hasStreetName ||
    instruction.includes("trail") ||
    instruction.includes("path") ||
    instruction.includes("track") ||
    instruction.includes("walkway") ||
    instruction.includes("footway") ||
    instruction.includes("steps") ||
    instruction.includes("crosswalk")
  );
}

function buildSegments(legs: ValhallaLeg[]): RouteSegment[] {
  return legs.flatMap((leg) => {
    const coords = decodeLine(leg.shape);
    return leg.maneuvers
      .map((maneuver) => ({
        coords: coords.slice(maneuver.begin_shape_index, maneuver.end_shape_index + 1),
        type: isPathManeuver(maneuver) ? "path" : "road",
      }))
      .filter((segment): segment is RouteSegment => segment.coords.length > 1);
  });
}

function buildWaypointDistances(legs: ValhallaLeg[]): number[] {
  const distances = [0];
  for (const leg of legs) {
    distances.push(distances[distances.length - 1]! + leg.summary.length);
  }
  return distances;
}

export function useOsrmRoute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (waypoints: LatLng[]): Promise<RouteResult | null> => {
    if (waypoints.length < 2) return null;
    setLoading(true);
    setError(null);

    try {
      const routeRequest = {
        locations: waypoints.map((waypoint) => ({ lat: waypoint.lat, lon: waypoint.lng })),
        costing: "pedestrian",
        costing_options: {
          pedestrian: {
            use_highways: 0,
            use_tracks: 1,
            use_living_streets: 0.2,
            // Make footpaths/trails much cheaper than roads so the router
            // takes them even when a road alternative is shorter.
            walkway_factor: 0.3,
          },
        },
        directions_options: {
          units: "kilometers",
        },
      };

      const url = `${VALHALLA_ROUTE_URL}?json=${encodeURIComponent(JSON.stringify(routeRequest))}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Routing service responded ${res.status}`);

      const data = (await res.json()) as ValhallaRoute;
      if (data.error) throw new Error(data.error);

      const legs = data.trip?.legs ?? [];
      if (legs.length === 0 || !data.trip?.summary) {
        throw new Error(data.status_message || "No hiking route found between these points");
      }

      if (data.trip.summary.has_highway || legs.some((leg) => leg.summary.has_highway)) {
        throw new Error("No highway-free hiking route found between these points");
      }

      const coords = legs.flatMap((leg, index) => {
        const legCoords = decodeLine(leg.shape);
        return index === 0 ? legCoords : legCoords.slice(1);
      });

      return {
        coords,
        segments: buildSegments(legs),
        distanceKm: data.trip.summary.length,
        waypointDistancesKm: buildWaypointDistances(legs),
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : "Routing failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchRoute, loading, error };
}
