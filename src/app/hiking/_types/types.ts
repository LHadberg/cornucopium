export interface LatLng {
  lat: number;
  lng: number;
}

export interface Waypoint extends LatLng {
  name: string;
  elevationM: number | null;
}

// A point along the routed track. Elevation is absent on routes saved
// before track elevations were kept.
export interface TrackPoint extends LatLng {
  eleM?: number;
}

export interface RouteSegment {
  coords: LatLng[];
  type: "road" | "path" | "track" | "walkway" | "steps";
}

export interface SavedRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  routeCoords: TrackPoint[];
  routeSegments: RouteSegment[];
  routeWaypointDistancesKm: number[];
  distanceKm: number;
  createdAt: string;
}
