import { useCallback, useMemo, useState } from "react";
import type { LatLngTuple } from "leaflet";
import { IconMenu2, IconRoute } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { HikeMap } from "./hike-map";
import type { SearchPin } from "./hike-map";
import { SearchControl } from "./search-control";
import type { SearchResult } from "./search-control";
import { Sidebar } from "./sidebar";
import { useOsrmRoute } from "../_hooks/use-osrm-route";
import { useRoutes } from "../_hooks/use-routes";
import i18n from "../../dice-roller/_i18n/i18n";
import styles from "../_styles/Hiking.module.css";
import type { LatLng, RouteSegment, SavedRoute, Waypoint } from "../_types/types";

function defaultWaypointName(index: number) {
  if (index === 0) return i18n.t("hiking.start");
  return i18n.t("hiking.stop", { n: index });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slugifyFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "hiking-route"
  );
}

function computeElevationGainM(waypoints: Waypoint[]) {
  return waypoints.reduce((gain, waypoint, index) => {
    if (index === 0) return gain;
    const previous = waypoints[index - 1]!;
    if (previous.elevationM === null || waypoint.elevationM === null) return gain;
    return gain + Math.max(0, waypoint.elevationM - previous.elevationM);
  }, 0);
}

function estimateHikingMinutes(distanceKm: number | null, elevationGainM: number) {
  if (distanceKm === null) return null;
  return Math.round((distanceKm / 5 + elevationGainM / 600) * 60);
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return i18n.t("hiking.pending");
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return i18n.t("hiking.durationMin", { m: mins });
  if (mins === 0) return i18n.t("hiking.durationHr", { h: hours });
  return i18n.t("hiking.durationHrMin", { h: hours, m: mins });
}

function routeStats(route: Pick<SavedRoute, "waypoints" | "distanceKm">) {
  const elevationGainM = computeElevationGainM(route.waypoints);
  return {
    elevationGainM,
    estimatedTime: formatDuration(estimateHikingMinutes(route.distanceKm, elevationGainM)),
  };
}

function buildGpx(routeName: string, waypoints: Waypoint[], routeCoords: LatLng[]) {
  // A navigation GPX must contain a single line representation. Emitting the
  // waypoints as a <rte> alongside the <trk> makes devices (e.g. Coros) draw
  // straight waypoint-to-waypoint chords over the actual track, so waypoints
  // are exported as standalone <wpt> markers instead.
  const waypointMarkers = waypoints
    .map(
      (waypoint) =>
        `  <wpt lat="${waypoint.lat}" lon="${waypoint.lng}">\n` +
        (waypoint.elevationM === null ? "" : `    <ele>${waypoint.elevationM.toFixed(1)}</ele>\n`) +
        `    <name>${escapeXml(waypoint.name)}</name>\n` +
        "  </wpt>",
    )
    .join("\n");

  const trackPoints = routeCoords
    .map((coord) => `      <trkpt lat="${coord.lat}" lon="${coord.lng}" />`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cornucopium Hiking Routes" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>
  </metadata>
${waypointMarkers}
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`;
}

function routeBounds(coords: LatLng[]): [LatLngTuple, LatLngTuple] {
  let minLat = coords[0]!.lat;
  let maxLat = coords[0]!.lat;
  let minLng = coords[0]!.lng;
  let maxLng = coords[0]!.lng;
  for (const coord of coords) {
    minLat = Math.min(minLat, coord.lat);
    maxLat = Math.max(maxLat, coord.lat);
    minLng = Math.min(minLng, coord.lng);
    maxLng = Math.max(maxLng, coord.lng);
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

async function fetchElevationM(latlng: LatLng): Promise<number | null> {
  const params = new URLSearchParams({
    latitude: String(latlng.lat),
    longitude: String(latlng.lng),
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { elevation?: number[] };
    return data.elevation?.[0] ?? null;
  } catch {
    return null;
  }
}

export function HikingApp() {
  const { t, i18n: i18nInstance } = useTranslation();
  const language = i18nInstance.language;
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeCoords, setRouteCoords] = useState<LatLng[] | null>(null);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[] | null>(null);
  const [routeWaypointDistancesKm, setRouteWaypointDistancesKm] = useState<number[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingRouteCreatedAt, setEditingRouteCreatedAt] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    bounds: [LatLngTuple, LatLngTuple] | null;
    lat: number;
    lng: number;
    seq: number;
  } | null>(null);
  const [searchPin, setSearchPin] = useState<SearchPin | null>(null);

  const { fetchRoute, loading: routeLoading, error: routeError } = useOsrmRoute();
  const { routes, saveRoute, deleteRoute, persistence, loading: savedRoutesLoading } = useRoutes();
  const elevationGainM = useMemo(() => computeElevationGainM(waypoints), [waypoints]);
  const estimatedTimeMinutes = useMemo(
    () => estimateHikingMinutes(distanceKm, elevationGainM),
    [distanceKm, elevationGainM],
  );
  const activeRoute = useMemo(
    () => routes.find((route: SavedRoute) => route.id === activeRouteId) ?? null,
    [activeRouteId, routes],
  );
  const activeRouteStats = useMemo(
    () => (activeRoute ? routeStats(activeRoute) : null),
    // The stats include a formatted duration string, so recompute on language change
    [activeRoute, language],
  );
  const editingRouteName = useMemo(
    () => routes.find((route: SavedRoute) => route.id === editingRouteId)?.name ?? "",
    [editingRouteId, routes],
  );

  const updateRoute = useCallback(
    async (newWaypoints: Waypoint[]) => {
      if (newWaypoints.length >= 2) {
        const result = await fetchRoute(newWaypoints);
        if (result) {
          setRouteCoords(result.coords);
          setRouteSegments(result.segments);
          setRouteWaypointDistancesKm(result.waypointDistancesKm);
          setDistanceKm(result.distanceKm);
        }
      } else {
        setRouteCoords(null);
        setRouteSegments(null);
        setRouteWaypointDistancesKm(newWaypoints.length === 1 ? [0] : []);
        setDistanceKm(null);
      }
    },
    [fetchRoute],
  );

  const handleMapClick = useCallback(
    async (latlng: LatLng) => {
      const waypoint: Waypoint = {
        ...latlng,
        name: defaultWaypointName(waypoints.length),
        elevationM: await fetchElevationM(latlng),
      };
      const newWaypoints = [...waypoints, waypoint];
      setWaypoints(newWaypoints);
      await updateRoute(newWaypoints);
    },
    [updateRoute, waypoints],
  );

  function handleTogglePlacing() {
    if (placingMode) {
      setPlacingMode(false);
    } else {
      setPlacingMode(true);
      setWaypoints([]);
      setRouteCoords(null);
      setRouteSegments(null);
      setRouteWaypointDistancesKm([]);
      setDistanceKm(null);
    }
  }

  const handleDeleteWaypoint = useCallback(
    async (index: number) => {
      const newWaypoints = waypoints.filter((_, waypointIndex) => waypointIndex !== index);
      setWaypoints(newWaypoints);
      await updateRoute(newWaypoints);
    },
    [updateRoute, waypoints],
  );

  const handleMoveWaypoint = useCallback(
    async (from: number, to: number) => {
      const newWaypoints = [...waypoints];
      const [moved] = newWaypoints.splice(from, 1);
      if (!moved) return;
      newWaypoints.splice(to, 0, moved);
      setWaypoints(newWaypoints);
      await updateRoute(newWaypoints);
    },
    [updateRoute, waypoints],
  );

  const handleRenameWaypoint = useCallback((index: number, name: string) => {
    setWaypoints((prev) =>
      prev.map((waypoint, waypointIndex) =>
        waypointIndex === index
          ? { ...waypoint, name: name.trim() || defaultWaypointName(waypointIndex) }
          : waypoint,
      ),
    );
  }, []);

  const handleEditRoute = useCallback(
    (id: string) => {
      const route = routes.find((r: SavedRoute) => r.id === id);
      if (!route) return;
      setWaypoints(route.waypoints);
      setRouteCoords(route.routeCoords);
      setRouteSegments(route.routeSegments);
      setRouteWaypointDistancesKm(route.routeWaypointDistancesKm);
      setDistanceKm(route.distanceKm);
      setPlacingMode(false);
      setActiveRouteId(null);
      setEditingRouteId(id);
      setEditingRouteCreatedAt(route.createdAt);
      setMobileMenuOpen(false);
    },
    [routes],
  );

  function handleFlyTo(
    bounds: [LatLngTuple, LatLngTuple] | null,
    lat: number,
    lng: number,
  ) {
    setFlyTarget((prev) => ({ bounds, lat, lng, seq: (prev?.seq ?? 0) + 1 }));
  }

  function handleSearchSelect(result: SearchResult) {
    setSearchPin({ lat: result.lat, lng: result.lng, name: result.name, label: result.label });
    handleFlyTo(result.bounds, result.lat, result.lng);
  }

  async function handleAddSearchWaypoint() {
    if (!searchPin) return;
    const waypoint: Waypoint = {
      lat: searchPin.lat,
      lng: searchPin.lng,
      name: searchPin.name || defaultWaypointName(waypoints.length),
      elevationM: await fetchElevationM(searchPin),
    };
    const newWaypoints = [...waypoints, waypoint];
    setWaypoints(newWaypoints);
    setSearchPin(null);
    await updateRoute(newWaypoints);
  }

  function handleClear() {
    setWaypoints([]);
    setRouteCoords(null);
    setRouteSegments(null);
    setRouteWaypointDistancesKm([]);
    setDistanceKm(null);
    setPlacingMode(false);
    setEditingRouteId(null);
    setEditingRouteCreatedAt(null);
  }

  function handleSaveRoute(name: string) {
    if (waypoints.length < 2 || !routeCoords || !routeSegments || distanceKm === null) return;
    saveRoute(
      name,
      waypoints,
      routeCoords,
      routeSegments,
      routeWaypointDistancesKm,
      distanceKm,
      editingRouteId ?? undefined,
      editingRouteCreatedAt ?? undefined,
    );
    handleClear();
  }

  function handleExportGpx(routeName: string, exportWaypoints = waypoints, exportCoords = routeCoords) {
    if (!exportCoords || exportCoords.length < 2 || exportWaypoints.length < 2) return;
    const gpx = buildGpx(routeName, exportWaypoints, exportCoords);
    const url = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugifyFilename(routeName)}.gpx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleSelectRoute(id: string) {
    if (activeRouteId === id) {
      setActiveRouteId(null);
      return;
    }
    setActiveRouteId(id);
    const route = routes.find((r: SavedRoute) => r.id === id);
    if (route && route.routeCoords.length > 0) {
      const first = route.routeCoords[0]!;
      handleFlyTo(routeBounds(route.routeCoords), first.lat, first.lng);
    }
    setMobileMenuOpen(false);
  }

  return (
    <div className={styles.appLayout}>
      <header className={styles.mobileHeader}>
        <button
          className={styles.burgerBtn}
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={t(mobileMenuOpen ? "hiking.closeMenu" : "hiking.openMenu")}
          aria-expanded={mobileMenuOpen}
        >
          <IconMenu2 size={20} />
        </button>
        <IconRoute size={22} />
        <h1>{t("hiking.title")}</h1>
      </header>
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        waypoints={waypoints}
        routeCoords={routeCoords}
        routeWaypointDistancesKm={routeWaypointDistancesKm}
        distanceKm={distanceKm}
        elevationGainM={elevationGainM}
        estimatedTime={formatDuration(estimatedTimeMinutes)}
        routeLoading={routeLoading}
        routeError={routeError}
        placingMode={placingMode}
        savedRoutes={routes}
        activeRouteId={activeRouteId}
        activeRoute={activeRoute}
        activeRouteElevationGainM={activeRouteStats?.elevationGainM ?? 0}
        activeRouteEstimatedTime={activeRouteStats?.estimatedTime ?? t("hiking.pending")}
        persistence={persistence}
        savedRoutesLoading={savedRoutesLoading}
        editingRouteId={editingRouteId}
        editingRouteName={editingRouteName}
        onTogglePlacing={handleTogglePlacing}
        onClear={handleClear}
        onSaveRoute={handleSaveRoute}
        onExportGpx={handleExportGpx}
        onSelectRoute={handleSelectRoute}
        onDeleteRoute={deleteRoute}
        onEditRoute={handleEditRoute}
        onDeleteWaypoint={handleDeleteWaypoint}
        onMoveWaypoint={handleMoveWaypoint}
        onRenameWaypoint={handleRenameWaypoint}
      />
      <main className={styles.mapContainer}>
        <HikeMap
          waypoints={waypoints}
          routeCoords={routeCoords}
          routeSegments={routeSegments}
          savedRoutes={routes}
          placingMode={placingMode}
          onMapClick={handleMapClick}
          activeRouteId={activeRouteId}
          flyTarget={flyTarget}
          searchPin={searchPin}
          onAddSearchWaypoint={handleAddSearchWaypoint}
        />
        <SearchControl onSelect={handleSearchSelect} onClear={() => setSearchPin(null)} />
        {routeLoading && (
          <div className={styles.mapOverlay}>{t("hiking.findingRoute")}</div>
        )}
      </main>
    </div>
  );
}
