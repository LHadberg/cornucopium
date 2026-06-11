import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import {
  IconArrowsMoveVertical,
  IconDownload,
  IconMapPinPlus,
  IconPencil,
  IconPlayerStop,
  IconRoute,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import styles from "../_styles/Hiking.module.css";
import type { LatLng, SavedRoute, Waypoint } from "../_types/types";

interface Props {
  isMobileOpen: boolean;
  waypoints: Waypoint[];
  routeCoords: LatLng[] | null;
  routeWaypointDistancesKm: number[];
  distanceKm: number | null;
  elevationGainM: number;
  estimatedTime: string;
  routeLoading: boolean;
  routeError: string | null;
  placingMode: boolean;
  savedRoutes: SavedRoute[];
  activeRouteId: string | null;
  activeRoute: SavedRoute | null;
  activeRouteElevationGainM: number;
  activeRouteEstimatedTime: string;
  persistence: "database" | "browser";
  savedRoutesLoading: boolean;
  editingRouteId: string | null;
  editingRouteName: string;
  onTogglePlacing: () => void;
  onClear: () => void;
  onSaveRoute: (name: string) => void;
  onExportGpx: (name: string, waypoints?: Waypoint[], routeCoords?: LatLng[] | null) => void;
  onSelectRoute: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  onEditRoute: (id: string) => void;
  onDeleteWaypoint: (index: number) => void;
  onMoveWaypoint: (from: number, to: number) => void;
  onRenameWaypoint: (index: number, name: string) => void;
}

function waypointLabel(index: number, total: number) {
  if (index === 0) return "Start";
  if (index === total - 1) return "End";
  return `Stop ${index}`;
}

function dotClass(index: number, total: number) {
  if (index === 0) return styles.dotGreen;
  if (index === total - 1) return styles.dotRed;
  return styles.dotBlue;
}

function computeInsertIndex(from: number, targetIndex: number, before: boolean): number {
  if (before) return from < targetIndex ? targetIndex - 1 : targetIndex;
  return from < targetIndex ? targetIndex : targetIndex + 1;
}

function formatStopDistance(distanceKm: number | undefined) {
  if (distanceKm === undefined) return "Pending";
  return `${distanceKm.toFixed(2)} km`;
}

function formatElevation(elevationM: number | null) {
  if (elevationM === null) return "Elevation unavailable";
  return `${Math.round(elevationM)} m`;
}

export function Sidebar({
  isMobileOpen,
  waypoints,
  routeCoords,
  routeWaypointDistancesKm,
  distanceKm,
  elevationGainM,
  estimatedTime,
  routeLoading,
  routeError,
  placingMode,
  savedRoutes,
  activeRouteId,
  activeRoute,
  activeRouteElevationGainM,
  activeRouteEstimatedTime,
  persistence,
  savedRoutesLoading,
  editingRouteId,
  editingRouteName,
  onTogglePlacing,
  onClear,
  onSaveRoute,
  onExportGpx,
  onSelectRoute,
  onDeleteRoute,
  onEditRoute,
  onDeleteWaypoint,
  onMoveWaypoint,
  onRenameWaypoint,
}: Props) {
  const [routeName, setRouteName] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; before: boolean } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    setRouteName(editingRouteId ? editingRouteName : "");
  }, [editingRouteId, editingRouteName]);

  function handleDragStart(event: DragEvent, index: number) {
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    setDropTarget({ index, before });
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (dragIndex !== null && dropTarget !== null) {
      const to = computeInsertIndex(dragIndex, dropTarget.index, dropTarget.before);
      if (to !== dragIndex) onMoveWaypoint(dragIndex, to);
    }
    setDragIndex(null);
    setDropTarget(null);
  }

  function fallbackRouteName() {
    if (editingRouteId) return editingRouteName;
    return `Route ${savedRoutes.length + 1}`;
  }

  function handleSave() {
    onSaveRoute(routeName.trim() || fallbackRouteName());
    setRouteName("");
  }

  function routeDisplayName() {
    return routeName.trim() || fallbackRouteName();
  }

  function startEditingWaypoint(index: number) {
    setEditingIndex(index);
    setEditingName(waypoints[index]!.name);
  }

  function commitWaypointName() {
    if (editingIndex === null) return;
    onRenameWaypoint(editingIndex, editingName);
    setEditingIndex(null);
    setEditingName("");
  }

  const placingHint =
    waypoints.length === 0
      ? "Click to place start point"
      : waypoints.length === 1
        ? "Click to place end point"
        : "Click to add more stops";

  return (
    <aside className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ""}`}>
      <header className={styles.sidebarHeader}>
        <IconRoute size={22} />
        <h1>Hiking Routes</h1>
      </header>

      <section className={styles.panel}>
        <h2>Plan a Route</h2>

        <div className={styles.btnRow}>
          <button
            className={`${styles.btn} ${placingMode ? styles.btnActive : styles.btnPrimary}`}
            onClick={onTogglePlacing}
          >
            <IconMapPinPlus size={16} />
            {placingMode ? "Done adding" : "Add waypoints"}
          </button>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClear}
            disabled={waypoints.length === 0 && !placingMode}
          >
            <IconX size={16} />
            Clear
          </button>
        </div>

        {placingMode && <p className={styles.hint}>{placingHint}</p>}

        {editingRouteId && (
          <p className={`${styles.hint} ${styles.editingHint}`}>
            <IconPencil size={13} />
            Editing &quot;{editingRouteName}&quot; - Update saves your changes, Clear cancels.
          </p>
        )}

        {(waypoints.length > 0 || placingMode) && (
          <div className={styles.waypoints}>
            {waypoints.map((waypoint, index) => {
              const isDragging = dragIndex === index;
              const isDropBefore = dropTarget?.index === index && dropTarget.before && dragIndex !== index;
              const isDropAfter = dropTarget?.index === index && !dropTarget.before && dragIndex !== index;
              return (
                <div
                  key={`${waypoint.lat}-${waypoint.lng}-${index}`}
                  className={[
                    styles.waypoint,
                    styles.waypointSet,
                    isDragging ? styles.wpDragging : "",
                    isDropBefore ? styles.wpDropBefore : "",
                    isDropAfter ? styles.wpDropAfter : "",
                  ].filter(Boolean).join(" ")}
                  draggable={editingIndex !== index}
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDrop={handleDrop}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropTarget(null);
                  }}
                >
                  <IconArrowsMoveVertical className={styles.dragHandle} size={15} />
                  <span className={`${styles.dot} ${dotClass(index, waypoints.length)}`} />
                  <span className={styles.waypointContent}>
                    <span className={styles.waypointKicker}>{waypointLabel(index, waypoints.length)}</span>
                    {editingIndex === index ? (
                      <input
                        className={styles.waypointNameInput}
                        value={editingName}
                        autoFocus
                        onChange={(event) => setEditingName(event.target.value)}
                        onBlur={commitWaypointName}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitWaypointName();
                          if (event.key === "Escape") {
                            setEditingIndex(null);
                            setEditingName("");
                          }
                        }}
                      />
                    ) : (
                      <button
                        className={styles.waypointNameBtn}
                        onClick={() => startEditingWaypoint(index)}
                        title="Rename stop"
                      >
                        {waypoint.name}
                      </button>
                    )}
                    <span className={styles.waypointMeta}>
                      {formatStopDistance(routeWaypointDistancesKm[index])} | {formatElevation(waypoint.elevationM)}
                    </span>
                  </span>
                  <button
                    className={`${styles.iconBtn} ${styles.dangerBtn}`}
                    onClick={() => onDeleteWaypoint(index)}
                    title="Remove waypoint"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              );
            })}
            {placingMode && (
              <div className={styles.waypoint}>
                <span className={`${styles.dot} ${waypoints.length === 0 ? styles.dotGreen : styles.dotBlue}`} />
                <span>
                  {waypoints.length === 0
                    ? "Start - click to place"
                    : waypoints.length === 1
                      ? "End - click to place"
                      : "Next stop - click to add"}
                </span>
              </div>
            )}
          </div>
        )}

        {routeLoading && <p className={`${styles.hint} ${styles.loading}`}>Finding a highway-free hiking route...</p>}
        {routeError && <p className={`${styles.hint} ${styles.error}`}>{routeError}</p>}

        {routeCoords && distanceKm !== null && (
          <div className={styles.routeInfo}>
            <div className={styles.routeStats}>
              <span>Distance <strong>{distanceKm.toFixed(2)} km</strong></span>
              <span>Ascent <strong>{Math.round(elevationGainM)} m</strong></span>
              <span>Est. time <strong>{estimatedTime}</strong></span>
            </div>
            <div className={styles.saveRow}>
              <input
                className={styles.input}
                placeholder="Route name (optional)"
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSave()}
              />
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>
                {editingRouteId ? "Update" : "Save"}
              </button>
            </div>
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}
              onClick={() => onExportGpx(routeDisplayName())}
            >
              <IconDownload size={16} />
              Export GPX
            </button>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>
          Saved Routes {savedRoutes.length > 0 && <span className={styles.badge}>{savedRoutes.length}</span>}
        </h2>
        <p className={styles.hint}>
          {persistence === "database" ? "Saved to your account." : "Saved in this browser until you sign in."}
        </p>
        {savedRoutesLoading ? (
          <p className={styles.hint}>Loading saved routes...</p>
        ) : savedRoutes.length === 0 ? (
          <p className={styles.hint}>No saved routes yet.</p>
        ) : (
          <>
            {activeRoute && (
              <div className={styles.savedRouteDetail}>
                <div className={styles.routeDetailHead}>
                  <strong>{activeRoute.name}</strong>
                  <button
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                    onClick={() => onExportGpx(activeRoute.name, activeRoute.waypoints, activeRoute.routeCoords)}
                  >
                    <IconDownload size={14} />
                    Export
                  </button>
                </div>
                <div className={styles.routeStats}>
                  <span>Distance <strong>{activeRoute.distanceKm.toFixed(2)} km</strong></span>
                  <span>Ascent <strong>{Math.round(activeRouteElevationGainM)} m</strong></span>
                  <span>Est. time <strong>{activeRouteEstimatedTime}</strong></span>
                </div>
              </div>
            )}
            <ul className={styles.routeList}>
              {savedRoutes.map((route) => (
                <li
                  key={route.id}
                  className={`${styles.routeItem} ${activeRouteId === route.id ? styles.routeItemActive : ""} ${editingRouteId === route.id ? styles.routeItemEditing : ""}`}
                  onClick={() => onSelectRoute(route.id)}
                >
                  <div className={styles.routeItemMain}>
                    <span className={styles.routeName}>{route.name}</span>
                    <span className={styles.routeDist}>{route.distanceKm.toFixed(1)} km</span>
                  </div>
                  <span className={styles.routeDate}>{new Date(route.createdAt).toLocaleDateString()}</span>
                  <span className={styles.routeActions}>
                    <button
                      className={`${styles.iconBtn} ${styles.editBtn}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditRoute(route.id);
                      }}
                      title="Edit route"
                    >
                      <IconPencil size={14} />
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.dangerBtn}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteRoute(route.id);
                      }}
                      title="Delete route"
                    >
                      <IconTrash size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </aside>
  );
}
