import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LatLngTuple } from "leaflet";
import { IconMenu2, IconRoute } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { HikeMap } from "./hike-map";
import type { SearchPin } from "./hike-map";
import { SearchControl } from "./search-control";
import type { SearchResult } from "./search-control";
import { Sidebar } from "./sidebar";
import { useBrouterRoute } from "../_hooks/use-brouter-route";
import { useRoutes } from "../_hooks/use-routes";
import i18n from "../../dice-roller/_i18n/i18n";
import styles from "../_styles/Hiking.module.css";
import type { LatLng, RouteSegment, SavedRoute, TrackPoint, Waypoint } from "../_types/types";

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

// Track elevations come from ~30 m SRTM tiles, so undulations below this
// threshold are treated as sampling noise rather than real climb.
const ELEVATION_NOISE_THRESHOLD_M = 10;

interface Climb {
  ascentM: number;
  descentM: number;
}

// Sums total climb and drop along the track profile with a hysteresis
// filter: the reference elevation only moves once the track has climbed or
// dropped past the noise threshold. Returns null when the track carries no
// elevation data (routes saved before track elevations were kept).
function computeTrackClimb(coords: TrackPoint[] | null): Climb | null {
  if (!coords) return null;
  let reference: number | null = null;
  let ascentM = 0;
  let descentM = 0;
  for (const coord of coords) {
    if (coord.eleM === undefined) continue;
    if (reference === null) {
      reference = coord.eleM;
      continue;
    }
    const diff = coord.eleM - reference;
    if (diff >= ELEVATION_NOISE_THRESHOLD_M) {
      ascentM += diff;
      reference = coord.eleM;
    } else if (diff <= -ELEVATION_NOISE_THRESHOLD_M) {
      descentM -= diff;
      reference = coord.eleM;
    }
  }
  return reference === null ? null : { ascentM, descentM };
}

// Tracks without elevation data fall back to the spot elevations at the
// waypoints, which can only see waypoint-to-waypoint ascent.
function computeClimb(routeCoords: TrackPoint[] | null, waypoints: Waypoint[]): Climb {
  return computeTrackClimb(routeCoords) ?? { ascentM: computeElevationGainM(waypoints), descentM: 0 };
}

// Naismith's rule with a descent correction: 5 km/h on the flat, an hour
// extra per 600 m climbed, and an hour extra per 1500 m descended.
function estimateHikingMinutes(distanceKm: number | null, climb: Climb) {
  if (distanceKm === null) return null;
  return Math.round((distanceKm / 5 + climb.ascentM / 600 + climb.descentM / 1500) * 60);
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return i18n.t("hiking.pending");
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return i18n.t("hiking.durationMin", { m: mins });
  if (mins === 0) return i18n.t("hiking.durationHr", { h: hours });
  return i18n.t("hiking.durationHrMin", { h: hours, m: mins });
}

function routeStats(route: Pick<SavedRoute, "waypoints" | "routeCoords" | "distanceKm">) {
  const climb = computeClimb(route.routeCoords, route.waypoints);
  return {
    ...climb,
    estimatedTime: formatDuration(estimateHikingMinutes(route.distanceKm, climb)),
  };
}

function buildGpx(routeName: string, waypoints: Waypoint[], routeCoords: TrackPoint[]) {
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
    .map((coord) =>
      coord.eleM === undefined
        ? `      <trkpt lat="${coord.lat}" lon="${coord.lng}" />`
        : `      <trkpt lat="${coord.lat}" lon="${coord.lng}"><ele>${coord.eleM.toFixed(1)}</ele></trkpt>`,
    )
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

interface WorkingSnapshot {
  waypoints: Waypoint[];
  routeCoords: TrackPoint[] | null;
  routeSegments: RouteSegment[] | null;
  routeWaypointDistancesKm: number[];
  distanceKm: number | null;
  editingRouteId: string | null;
  editingRouteCreatedAt: string | null;
}

const HISTORY_LIMIT = 50;

// The public Valhalla server allows ~1 request/second per IP; throttled
// responses lack CORS headers and surface as fetch failures in the console.
const DRAG_ROUTE_INTERVAL_MS = 1100;

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
  const [routeCoords, setRouteCoords] = useState<TrackPoint[] | null>(null);
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
  const [routeFitSeq, setRouteFitSeq] = useState(0);

  const { fetchRoute, loading: routeLoading, error: routeError } = useBrouterRoute();
  const { routes, saveRoute, deleteRoute, persistence, loading: savedRoutesLoading } = useRoutes();
  const climb = useMemo(() => computeClimb(routeCoords, waypoints), [routeCoords, waypoints]);
  const estimatedTimeMinutes = useMemo(
    () => estimateHikingMinutes(distanceKm, climb),
    [distanceKm, climb],
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

  const routeRequestSeqRef = useRef(0);
  const lastDragRouteAtRef = useRef(0);
  const dragHistoryPushedRef = useRef(false);

  // Mirror of the working-route state, refreshed every render, so history
  // pushes can capture the current state synchronously from event handlers.
  const currentSnapshot: WorkingSnapshot = {
    waypoints,
    routeCoords,
    routeSegments,
    routeWaypointDistancesKm,
    distanceKm,
    editingRouteId,
    editingRouteCreatedAt,
  };
  const snapshotRef = useRef(currentSnapshot);
  snapshotRef.current = currentSnapshot;
  const pastRef = useRef<WorkingSnapshot[]>([]);
  const futureRef = useRef<WorkingSnapshot[]>([]);

  const pushHistory = useCallback(() => {
    pastRef.current.push(snapshotRef.current);
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
  }, []);

  const applySnapshot = useCallback((snapshot: WorkingSnapshot) => {
    // Invalidate in-flight re-routes so they can't clobber the restored state.
    routeRequestSeqRef.current++;
    setWaypoints(snapshot.waypoints);
    setRouteCoords(snapshot.routeCoords);
    setRouteSegments(snapshot.routeSegments);
    setRouteWaypointDistancesKm(snapshot.routeWaypointDistancesKm);
    setDistanceKm(snapshot.distanceKm);
    setEditingRouteId(snapshot.editingRouteId);
    setEditingRouteCreatedAt(snapshot.editingRouteCreatedAt);
  }, []);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(snapshotRef.current);
    applySnapshot(previous);
  }, [applySnapshot]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(snapshotRef.current);
    applySnapshot(next);
  }, [applySnapshot]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const updateRoute = useCallback(
    async (newWaypoints: Waypoint[], opts?: { silent?: boolean; fit?: boolean }) => {
      if (newWaypoints.length >= 2) {
        // Drag previews fire overlapping requests; only the newest may win.
        const seq = ++routeRequestSeqRef.current;
        const result = await fetchRoute(newWaypoints, { silent: opts?.silent });
        if (result && seq === routeRequestSeqRef.current) {
          setRouteCoords(result.coords);
          setRouteSegments(result.segments);
          setRouteWaypointDistancesKm(result.waypointDistancesKm);
          setDistanceKm(result.distanceKm);
          if (opts?.fit !== false) setRouteFitSeq((prev) => prev + 1);
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
      pushHistory();
      const waypoint: Waypoint = {
        ...latlng,
        name: defaultWaypointName(waypoints.length),
        elevationM: await fetchElevationM(latlng),
      };
      const newWaypoints = [...waypoints, waypoint];
      setWaypoints(newWaypoints);
      await updateRoute(newWaypoints);
    },
    [pushHistory, updateRoute, waypoints],
  );

  function handleTogglePlacing() {
    if (placingMode) {
      setPlacingMode(false);
      return;
    }
    setPlacingMode(true);
    // While editing a saved route, "Add waypoints" appends to the loaded
    // route instead of starting a fresh one.
    if (!editingRouteId) {
      setWaypoints([]);
      setRouteCoords(null);
      setRouteSegments(null);
      setRouteWaypointDistancesKm([]);
      setDistanceKm(null);
    }
  }

  const handleDeleteWaypoint = useCallback(
    async (index: number) => {
      pushHistory();
      const newWaypoints = waypoints.filter((_, waypointIndex) => waypointIndex !== index);
      setWaypoints(newWaypoints);
      await updateRoute(newWaypoints);
    },
    [pushHistory, updateRoute, waypoints],
  );

  const handleMoveWaypoint = useCallback(
    async (from: number, to: number) => {
      const newWaypoints = [...waypoints];
      const [moved] = newWaypoints.splice(from, 1);
      if (!moved) return;
      pushHistory();
      newWaypoints.splice(to, 0, moved);
      setWaypoints(newWaypoints);
      await updateRoute(newWaypoints);
    },
    [pushHistory, updateRoute, waypoints],
  );

  const handleWaypointDrag = useCallback(
    (index: number, latlng: LatLng) => {
      // One history entry per drag gesture, captured before the first move.
      if (!dragHistoryPushedRef.current) {
        dragHistoryPushedRef.current = true;
        pushHistory();
      }
      // Live preview while dragging, throttled to the public routing
      // server's rate limit; the drop handler below issues the
      // authoritative re-route.
      const now = Date.now();
      if (now - lastDragRouteAtRef.current < DRAG_ROUTE_INTERVAL_MS) return;
      lastDragRouteAtRef.current = now;
      const newWaypoints = waypoints.map((waypoint, waypointIndex) =>
        waypointIndex === index ? { ...waypoint, ...latlng } : waypoint,
      );
      void updateRoute(newWaypoints, { silent: true, fit: false });
    },
    [pushHistory, updateRoute, waypoints],
  );

  const handleWaypointDragEnd = useCallback(
    async (index: number, latlng: LatLng) => {
      dragHistoryPushedRef.current = false;
      const elevationM = await fetchElevationM(latlng);
      const newWaypoints = waypoints.map((waypoint, waypointIndex) =>
        waypointIndex === index ? { ...waypoint, ...latlng, elevationM } : waypoint,
      );
      setWaypoints(newWaypoints);
      // Space the authoritative re-route out from the last preview so the
      // drop request itself doesn't get rate-limited.
      const wait = DRAG_ROUTE_INTERVAL_MS - (Date.now() - lastDragRouteAtRef.current);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastDragRouteAtRef.current = Date.now();
      await updateRoute(newWaypoints, { fit: false });
    },
    [updateRoute, waypoints],
  );

  const handleRenameWaypoint = useCallback(
    (index: number, name: string) => {
      pushHistory();
      setWaypoints((prev) =>
        prev.map((waypoint, waypointIndex) =>
          waypointIndex === index
            ? { ...waypoint, name: name.trim() || defaultWaypointName(waypointIndex) }
            : waypoint,
        ),
      );
    },
    [pushHistory],
  );

  const handleEditRoute = useCallback(
    (id: string) => {
      const route = routes.find((r: SavedRoute) => r.id === id);
      if (!route) return;
      pushHistory();
      setWaypoints(route.waypoints);
      setRouteCoords(route.routeCoords);
      setRouteSegments(route.routeSegments);
      setRouteWaypointDistancesKm(route.routeWaypointDistancesKm);
      setDistanceKm(route.distanceKm);
      setRouteFitSeq((prev) => prev + 1);
      setPlacingMode(false);
      setActiveRouteId(null);
      setEditingRouteId(id);
      setEditingRouteCreatedAt(route.createdAt);
      setMobileMenuOpen(false);
    },
    [pushHistory, routes],
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
    pushHistory();
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
    if (waypoints.length > 0 || routeCoords) pushHistory();
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
        ascentM={climb.ascentM}
        descentM={climb.descentM}
        estimatedTime={formatDuration(estimatedTimeMinutes)}
        routeLoading={routeLoading}
        routeError={routeError}
        placingMode={placingMode}
        savedRoutes={routes}
        activeRouteId={activeRouteId}
        activeRoute={activeRoute}
        activeRouteAscentM={activeRouteStats?.ascentM ?? 0}
        activeRouteDescentM={activeRouteStats?.descentM ?? 0}
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
          routeFitSeq={routeFitSeq}
          searchPin={searchPin}
          onAddSearchWaypoint={handleAddSearchWaypoint}
          onWaypointDrag={handleWaypointDrag}
          onWaypointDragEnd={handleWaypointDragEnd}
        />
        <SearchControl onSelect={handleSearchSelect} onClear={() => setSearchPin(null)} />
        {routeLoading && (
          <div className={styles.mapOverlay}>{t("hiking.findingRoute")}</div>
        )}
      </main>
    </div>
  );
}
