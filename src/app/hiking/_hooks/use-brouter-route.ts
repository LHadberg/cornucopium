import { useCallback, useState } from "react";
import type { LatLng, RouteSegment, TrackPoint } from "../_types/types";

interface RouteResult {
  coords: TrackPoint[];
  segments: RouteSegment[];
  distanceKm: number;
  waypointDistancesKm: number[];
}

// Columns of a BRouter "messages" row (see BRouter's MessageData format).
// Each row describes a run of consecutive edges sharing the same OSM way
// tags, ending at the coordinate given in the first two columns.
const MSG_LON = 0;
const MSG_LAT = 1;
const MSG_WAY_TAGS = 9;

interface BrouterGeoJson {
  features?: {
    properties: {
      "track-length": string;
      messages?: string[][];
    };
    geometry: {
      coordinates: [number, number, number?][];
    };
  }[];
}

const BROUTER_URL = "https://brouter.de/brouter";
// Hiking-specific cost model: prefers marked trails and paths over roads
// and does not penalize steps, matching how the Valhalla costing options
// were tuned before the switch.
const BROUTER_PROFILE = "hiking-mountain";

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function classifyWayTags(wayTags: string): RouteSegment["type"] {
  const highway = /(?:^|\s)highway=([^\s]+)/.exec(wayTags)?.[1];
  switch (highway) {
    case "steps":
      return "steps";
    case "track":
      return "track";
    case "footway":
    case "pedestrian":
    case "cycleway":
      return "walkway";
    case "path":
    case "bridleway":
    case undefined:
      return "path";
    default:
      return "road";
  }
}

// Message rows end on coordinates that appear verbatim in the track, so
// segments are built by scanning forward to each row's end coordinate.
function buildSegments(coords: LatLng[], messages: string[][]): RouteSegment[] {
  const segments: RouteSegment[] = [];
  let start = 0;
  for (const message of messages) {
    const lonMicro = Number(message[MSG_LON]);
    const latMicro = Number(message[MSG_LAT]);
    let end = -1;
    for (let i = start; i < coords.length; i++) {
      if (Math.round(coords[i]!.lng * 1e6) === lonMicro && Math.round(coords[i]!.lat * 1e6) === latMicro) {
        end = i;
        break;
      }
    }
    // Unmatched end coordinate: let this run merge into the next segment.
    if (end === -1) continue;
    const segmentCoords = coords.slice(start, end + 1);
    if (segmentCoords.length > 1) {
      segments.push({ coords: segmentCoords, type: classifyWayTags(message[MSG_WAY_TAGS] ?? "") });
    }
    start = end;
  }
  return segments;
}

// BRouter returns one continuous track without per-leg summaries, so
// distances at each waypoint are read off the track at the nearest track
// point, scaled so the last waypoint lands on the reported total.
function buildWaypointDistances(coords: LatLng[], waypoints: LatLng[], distanceKm: number): number[] {
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    cumulative.push(cumulative[i - 1]! + haversineKm(coords[i - 1]!, coords[i]!));
  }
  const total = cumulative[cumulative.length - 1]!;
  const scale = total > 0 ? distanceKm / total : 0;

  return waypoints.map((waypoint) => {
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dLat = coords[i]!.lat - waypoint.lat;
      const dLng = coords[i]!.lng - waypoint.lng;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    return cumulative[nearest]! * scale;
  });
}

export function useBrouterRoute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (
    waypoints: LatLng[],
    opts?: { silent?: boolean },
  ): Promise<RouteResult | null> => {
    // Silent requests (live previews while dragging a pin) skip the loading
    // overlay and swallow errors; the authoritative request on drop reports.
    const silent = opts?.silent ?? false;
    if (waypoints.length < 2) return null;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        lonlats: waypoints.map((waypoint) => `${waypoint.lng},${waypoint.lat}`).join("|"),
        profile: BROUTER_PROFILE,
        alternativeidx: "0",
        format: "geojson",
      });

      const res = await fetch(`${BROUTER_URL}?${params}`);
      if (!res.ok) {
        // BRouter reports errors as plain text with CORS headers intact.
        const message = (await res.text()).trim();
        throw new Error(message || `Routing service responded ${res.status}`);
      }

      const data = (await res.json()) as BrouterGeoJson;
      const feature = data.features?.[0];
      if (!feature) throw new Error("No hiking route found between these points");

      const coords: TrackPoint[] = feature.geometry.coordinates.map(([lng, lat, ele]) => ({ lat, lng, eleM: ele }));
      const distanceKm = Number(feature.properties["track-length"]) / 1000;
      const messages = feature.properties.messages?.slice(1) ?? [];

      return {
        coords,
        segments: buildSegments(coords, messages),
        distanceKm,
        waypointDistancesKm: buildWaypointDistances(coords, waypoints, distanceKm),
      };
    } catch (error) {
      if (!silent) setError(error instanceof Error ? error.message : "Routing failed");
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  return { fetchRoute, loading, error };
}
