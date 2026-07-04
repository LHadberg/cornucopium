import { useEffect, useRef, useState } from "react";
import type { LatLngTuple } from "leaflet";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { IconCurrentLocation } from "@tabler/icons-react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { MapClickHandler } from "./map-click-handler";
import styles from "../_styles/Hiking.module.css";
import type { LatLng, RouteSegment, SavedRoute, Waypoint } from "../_types/types";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeIcon(color: string) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const startIcon = makeIcon("green");
const endIcon = makeIcon("red");
const midIcon = makeIcon("blue");
const searchIcon = makeIcon("gold");

function LegendControl() {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ctrl = new L.Control({ position: "bottomright" });
    ctrl.onAdd = () => {
      const div = document.createElement("div");
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      setContainer(div);
      return div;
    };
    ctrl.addTo(map);
    return () => {
      ctrl.remove();
    };
  }, [map]);

  if (!container) return null;

  return createPortal(
    <div className={`${styles.mapLegend} ${open ? styles.mapLegendOpen : ""}`}>
      <button className={styles.legendToggle} onClick={() => setOpen((value) => !value)}>
        <span>Legend</span>
        <span>{open ? "v" : ">"}</span>
      </button>
      <div className={styles.legendBody}>
        <p className={styles.legendSection}>Waypoints</p>
        <div className={styles.legendRow}>
          <span className={styles.legendDot} style={{ background: "#22c55e" }} />
          <span>Start</span>
        </div>
        <div className={styles.legendRow}>
          <span className={styles.legendDot} style={{ background: "#3b82f6" }} />
          <span>Stop</span>
        </div>
        <div className={styles.legendRow}>
          <span className={styles.legendDot} style={{ background: "#ef4444" }} />
          <span>End</span>
        </div>
        <p className={styles.legendSection}>Path types</p>
        <div className={styles.legendRow}>
          <span className={styles.legendLine} style={{ background: "#2563eb" }} />
          <span>Street connector</span>
        </div>
        <div className={styles.legendRow}>
          <span
            className={`${styles.legendLine} ${styles.legendLineDashed}`}
            style={{ "--dash-color": "#7c3aed" } as CSSProperties}
          />
          <span>Trail / footpath</span>
        </div>
        <p className={styles.legendSection}>Saved routes</p>
        <div className={styles.legendRow}>
          <span className={styles.legendLine} style={{ background: "#16a34a" }} />
          <span>Saved</span>
        </div>
        <div className={styles.legendRow}>
          <span className={styles.legendLine} style={{ background: "#f59e0b" }} />
          <span>Selected</span>
        </div>
      </div>
    </div>,
    container,
  );
}

function LocateControl() {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [locating, setLocating] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);

  useEffect(() => {
    const ctrl = new L.Control({ position: "topright" });
    ctrl.onAdd = () => {
      const div = document.createElement("div");
      div.className = styles.locateControl!;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      setContainer(div);
      return div;
    };
    ctrl.addTo(map);
    return () => {
      ctrl.remove();
    };
  }, [map]);

  function handleLocate() {
    if (locating || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        setLocating(false);
        map.flyTo([next.lat, next.lng], 15, { duration: 1.0 });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <>
      {container &&
        createPortal(
          <button
            className={styles.locateBtn}
            onClick={handleLocate}
            disabled={locating}
            aria-label="Focus on my location"
            title="Focus on my location"
          >
            <IconCurrentLocation size={18} />
          </button>,
          container,
        )}
      {position && (
        <CircleMarker
          center={[position.lat, position.lng]}
          radius={7}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#3b82f6", fillOpacity: 1 }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>
      )}
    </>
  );
}

export interface SearchPin {
  lat: number;
  lng: number;
  name: string;
  label: string;
}

function SearchPinMarker({ pin, onAdd }: { pin: SearchPin; onAdd: () => void }) {
  const { t } = useTranslation();
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    markerRef.current?.openPopup();
  }, [pin]);

  return (
    <Marker ref={markerRef} position={[pin.lat, pin.lng]} icon={searchIcon}>
      <Popup autoPan={false}>
        <strong>{pin.name}</strong>
        <br />
        {pin.label}
        <br />
        <button className={styles.popupAddBtn} onClick={onAdd}>
          {t("hiking.addAsWaypoint")}
        </button>
      </Popup>
    </Marker>
  );
}

type FlyTarget = {
  bounds: [LatLngTuple, LatLngTuple] | null;
  lat: number;
  lng: number;
  seq: number;
} | null;

function FlyToLocation({ target }: { target: FlyTarget }) {
  const map = useMap();
  const prevSeq = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (target && target.seq !== prevSeq.current) {
      prevSeq.current = target.seq;
      if (target.bounds) {
        map.flyToBounds(target.bounds, { duration: 1.0, padding: [40, 40] });
      } else {
        map.flyTo([target.lat, target.lng], 13, { duration: 1.0 });
      }
    }
  }, [map, target]);

  return null;
}

function FlyToRoute({ coords }: { coords: LatLng[] | null }) {
  const map = useMap();
  const prev = useRef<LatLng[] | null>(null);

  useEffect(() => {
    if (coords && coords !== prev.current && coords.length > 1) {
      const bounds = L.latLngBounds(coords.map((coord) => [coord.lat, coord.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
      prev.current = coords;
    }
  }, [coords, map]);

  return null;
}

const SEGMENT_STYLES: Record<RouteSegment["type"], L.PolylineOptions> = {
  road: { color: "#2563eb", weight: 4, opacity: 0.9 },
  path: { color: "#7c3aed", weight: 3, opacity: 0.85, dashArray: "8 5" },
};

function savedRouteStyle(
  route: SavedRoute,
  activeRouteId: string | null,
  segmentType?: RouteSegment["type"],
): L.PolylineOptions {
  const isActive = activeRouteId === route.id;
  const routeColor = isActive ? "#f59e0b" : "#16a34a";

  return {
    color: segmentType === "path" ? "#7c3aed" : routeColor,
    weight: isActive ? 5 : 3,
    opacity: isActive ? 0.85 : 0.72,
    dashArray: segmentType === "path" ? "8 5" : undefined,
  };
}

interface Props {
  waypoints: Waypoint[];
  routeCoords: LatLng[] | null;
  routeSegments: RouteSegment[] | null;
  savedRoutes: SavedRoute[];
  placingMode: boolean;
  onMapClick: (latlng: LatLng) => void;
  activeRouteId: string | null;
  flyTarget: FlyTarget;
  searchPin: SearchPin | null;
  onAddSearchWaypoint: () => void;
}

export function HikeMap({
  waypoints,
  routeCoords,
  routeSegments,
  savedRoutes,
  placingMode,
  onMapClick,
  activeRouteId,
  flyTarget,
  searchPin,
  onAddSearchWaypoint,
}: Props) {
  return (
    <MapContainer
      center={[46.8, 8.2]}
      zoom={8}
      style={{ height: "100%", width: "100%" }}
      className={placingMode ? styles.cursorCrosshair : ""}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onMapClick={onMapClick} active={placingMode} />
      <FlyToRoute coords={routeCoords} />
      <FlyToLocation target={flyTarget} />
      <LegendControl />
      <LocateControl />

      {searchPin && <SearchPinMarker pin={searchPin} onAdd={onAddSearchWaypoint} />}

      {waypoints.map((waypoint, index) => (
        <Marker
          key={`${waypoint.lat}-${waypoint.lng}-${index}`}
          position={[waypoint.lat, waypoint.lng]}
          icon={index === 0 ? startIcon : index === waypoints.length - 1 ? endIcon : midIcon}
        >
          <Popup>
            {waypoint.name}
            <br />
            {waypoint.elevationM === null ? "Elevation unavailable" : `${Math.round(waypoint.elevationM)} m`}
          </Popup>
        </Marker>
      ))}

      {routeSegments && routeSegments.length > 0
        ? routeSegments.map((segment, index) => (
            <Polyline
              key={index}
              positions={segment.coords.map((coord) => [coord.lat, coord.lng])}
              pathOptions={SEGMENT_STYLES[segment.type]}
            />
          ))
        : routeCoords &&
          routeCoords.length > 1 && (
            <Polyline
              positions={routeCoords.map((coord) => [coord.lat, coord.lng])}
              pathOptions={SEGMENT_STYLES.road}
            />
          )}

      {savedRoutes.flatMap((route) => {
        const segments =
          route.routeSegments.length > 0
            ? route.routeSegments
            : [{ coords: route.routeCoords, type: "road" as const }];

        return segments.map((segment, index) => (
          <Polyline
            key={`${route.id}-${index}`}
            positions={segment.coords.map((coord) => [coord.lat, coord.lng])}
            pathOptions={savedRouteStyle(route, activeRouteId, segment.type)}
          >
            <Popup>
              <strong>{route.name}</strong>
              <br />
              {route.distanceKm.toFixed(1)} km
            </Popup>
          </Polyline>
        ));
      })}
    </MapContainer>
  );
}
