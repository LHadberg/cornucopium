export interface LatLng {
  lat: number;
  lng: number;
}

export interface Waypoint extends LatLng {
  name: string;
  elevationM: number | null;
}

export interface RouteSegment {
  coords: LatLng[];
  type: "road" | "path";
}

export interface SavedRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  routeCoords: LatLng[];
  routeSegments: RouteSegment[];
  routeWaypointDistancesKm: number[];
  distanceKm: number;
  createdAt: string;
}
