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
import { useTranslation } from "react-i18next";
import i18n from "../../dice-roller/_i18n/i18n";
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
  if (index === 0) return i18n.t("hiking.start");
  if (index === total - 1) return i18n.t("hiking.end");
  return i18n.t("hiking.stop", { n: index });
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
  if (distanceKm === undefined) return i18n.t("hiking.pending");
  return `${distanceKm.toFixed(2)} km`;
}

function formatElevation(elevationM: number | null) {
  if (elevationM === null) return i18n.t("hiking.elevationUnavailable");
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
  const { t } = useTranslation();
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
    return t("hiking.routeFallback", { n: savedRoutes.length + 1 });
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

  const placingHint = t(
    waypoints.length === 0
      ? "hiking.placeStartHint"
      : waypoints.length === 1
        ? "hiking.placeEndHint"
        : "hiking.addStopsHint",
  );

  return (
    <aside className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ""}`}>
      <header className={styles.sidebarHeader}>
        <IconRoute size={22} />
        <h1>{t("hiking.title")}</h1>
      </header>

      <section className={styles.panel}>
        <h2>{t("hiking.planRoute")}</h2>

        <div className={styles.btnRow}>
          <button
            className={`${styles.btn} ${placingMode ? styles.btnActive : styles.btnPrimary}`}
            onClick={onTogglePlacing}
          >
            <IconMapPinPlus size={16} />
            {t(placingMode ? "hiking.doneAdding" : "hiking.addWaypoints")}
          </button>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClear}
            disabled={waypoints.length === 0 && !placingMode}
          >
            <IconX size={16} />
            {t("hiking.clear")}
          </button>
        </div>

        {placingMode && <p className={styles.hint}>{placingHint}</p>}

        {editingRouteId && (
          <p className={`${styles.hint} ${styles.editingHint}`}>
            <IconPencil size={13} />
            {t("hiking.editingHint", { name: editingRouteName })}
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
                        title={t("hiking.renameStop")}
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
                    title={t("hiking.removeWaypoint")}
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
                  {t(
                    waypoints.length === 0
                      ? "hiking.startPlaceholder"
                      : waypoints.length === 1
                        ? "hiking.endPlaceholder"
                        : "hiking.nextStopPlaceholder",
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {routeLoading && <p className={`${styles.hint} ${styles.loading}`}>{t("hiking.findingRoute")}</p>}
        {routeError && <p className={`${styles.hint} ${styles.error}`}>{routeError}</p>}

        {routeCoords && distanceKm !== null && (
          <div className={styles.routeInfo}>
            <div className={styles.routeStats}>
              <span>{t("hiking.distance")} <strong>{distanceKm.toFixed(2)} km</strong></span>
              <span>{t("hiking.ascent")} <strong>{Math.round(elevationGainM)} m</strong></span>
              <span>{t("hiking.estTime")} <strong>{estimatedTime}</strong></span>
            </div>
            <div className={styles.saveRow}>
              <input
                className={styles.input}
                placeholder={t("hiking.routeNamePlaceholder")}
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSave()}
              />
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>
                {t(editingRouteId ? "hiking.update" : "hiking.save")}
              </button>
            </div>
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}
              onClick={() => onExportGpx(routeDisplayName())}
            >
              <IconDownload size={16} />
              {t("hiking.exportGpx")}
            </button>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>
          {t("hiking.savedRoutes")} {savedRoutes.length > 0 && <span className={styles.badge}>{savedRoutes.length}</span>}
        </h2>
        <p className={styles.hint}>
          {t(persistence === "database" ? "hiking.savedToAccount" : "hiking.savedToBrowser")}
        </p>
        {savedRoutesLoading ? (
          <p className={styles.hint}>{t("hiking.loadingRoutes")}</p>
        ) : savedRoutes.length === 0 ? (
          <p className={styles.hint}>{t("hiking.noRoutes")}</p>
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
                    {t("hiking.export")}
                  </button>
                </div>
                <div className={styles.routeStats}>
                  <span>{t("hiking.distance")} <strong>{activeRoute.distanceKm.toFixed(2)} km</strong></span>
                  <span>{t("hiking.ascent")} <strong>{Math.round(activeRouteElevationGainM)} m</strong></span>
                  <span>{t("hiking.estTime")} <strong>{activeRouteEstimatedTime}</strong></span>
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
                      title={t("hiking.editRoute")}
                    >
                      <IconPencil size={14} />
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.dangerBtn}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteRoute(route.id);
                      }}
                      title={t("hiking.deleteRoute")}
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
