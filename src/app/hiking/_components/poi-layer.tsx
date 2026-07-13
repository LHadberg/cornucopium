import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconBinoculars } from "@tabler/icons-react";
import L from "leaflet";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { useTranslation } from "react-i18next";
import styles from "../_styles/Hiking.module.css";
import type { LatLng } from "../_types/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
// Below this zoom an Overpass bbox query returns far too many objects to
// render or read, so the layer shows a "zoom in" hint instead.
const POI_MIN_ZOOM = 15;
const POI_MAX_RESULTS = 300;
// Panning fires moveend in bursts; wait for the map to settle before
// hitting the shared Overpass instance.
const POI_FETCH_DEBOUNCE_MS = 1000;
// Fetch a larger area than the viewport so small pans stay inside the
// already-fetched bounds and need no new request.
const POI_BBOX_PAD = 0.5;
// Fallback wait after a 429 when the server sends no Retry-After header.
const POI_COOLDOWN_MS = 30_000;

interface PoiCategory {
  // Suffix under the hiking.poi.* translation keys.
  labelKey: string;
  emoji: string;
  tag: string;
  values: string[];
}

// First matching entry wins when an object carries several of these tags.
const POI_CATEGORIES: PoiCategory[] = [
  { labelKey: "drinkingWater", emoji: "💧", tag: "amenity", values: ["drinking_water"] },
  { labelKey: "shelter", emoji: "⛺", tag: "amenity", values: ["shelter"] },
  { labelKey: "hut", emoji: "🛖", tag: "tourism", values: ["alpine_hut", "wilderness_hut"] },
  { labelKey: "toilets", emoji: "🚻", tag: "amenity", values: ["toilets"] },
  { labelKey: "viewpoint", emoji: "🔭", tag: "tourism", values: ["viewpoint"] },
  { labelKey: "picnic", emoji: "🧺", tag: "tourism", values: ["picnic_site"] },
  { labelKey: "picnic", emoji: "🧺", tag: "leisure", values: ["picnic_table"] },
  { labelKey: "campsite", emoji: "🏕️", tag: "tourism", values: ["camp_site"] },
  { labelKey: "cafe", emoji: "☕", tag: "amenity", values: ["cafe"] },
  { labelKey: "restaurant", emoji: "🍽️", tag: "amenity", values: ["restaurant", "fast_food"] },
  { labelKey: "pub", emoji: "🍺", tag: "amenity", values: ["pub", "bar"] },
  { labelKey: "grocery", emoji: "🛒", tag: "shop", values: ["supermarket", "convenience"] },
  { labelKey: "bakery", emoji: "🥐", tag: "shop", values: ["bakery"] },
  { labelKey: "parking", emoji: "🅿️", tag: "amenity", values: ["parking"] },
  { labelKey: "busStop", emoji: "🚌", tag: "highway", values: ["bus_stop"] },
  { labelKey: "trainStation", emoji: "🚆", tag: "railway", values: ["station", "halt"] },
  { labelKey: "attraction", emoji: "⭐", tag: "tourism", values: ["attraction"] },
  { labelKey: "castle", emoji: "🏰", tag: "historic", values: ["castle", "ruins"] },
  { labelKey: "monument", emoji: "🗿", tag: "historic", values: ["monument", "memorial"] },
  { labelKey: "cave", emoji: "🕳️", tag: "natural", values: ["cave_entrance"] },
  { labelKey: "waterfall", emoji: "💦", tag: "waterway", values: ["waterfall"] },
];

// One toggle per labelKey; categories sharing a key (e.g. the two picnic
// entries) are switched together.
const CATEGORY_TOGGLES = POI_CATEGORIES.filter(
  (category, index) =>
    POI_CATEGORIES.findIndex((other) => other.labelKey === category.labelKey) === index,
);

function buildOverpassQuery(bounds: L.LatLngBounds, selected: ReadonlySet<string>) {
  const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
  const valuesByTag = new Map<string, string[]>();
  for (const category of POI_CATEGORIES) {
    if (!selected.has(category.labelKey)) continue;
    valuesByTag.set(category.tag, [...(valuesByTag.get(category.tag) ?? []), ...category.values]);
  }
  const clauses = [...valuesByTag]
    .map(([tag, values]) => `nwr["${tag}"~"^(${values.join("|")})$"](${bbox});`)
    .join("");
  return `[out:json][timeout:25];(${clauses});out center ${POI_MAX_RESULTS};`;
}

function categorize(tags: Record<string, string>): PoiCategory | null {
  return (
    POI_CATEGORIES.find((category) => {
      const value = tags[category.tag];
      return value !== undefined && category.values.includes(value);
    }) ?? null
  );
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface Poi {
  id: string;
  lat: number;
  lng: number;
  name: string | undefined;
  category: PoiCategory;
  openingHours: string | undefined;
  website: string | undefined;
}

function toPoi(element: OverpassElement): Poi | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  const tags = element.tags;
  if (lat === undefined || lng === undefined || !tags) return null;
  const category = categorize(tags);
  if (!category) return null;
  return {
    id: `${element.type}/${element.id}`,
    lat,
    lng,
    name: tags.name,
    category,
    openingHours: tags.opening_hours,
    website: tags.website ?? tags["contact:website"],
  };
}

// One divIcon per emoji; Leaflet icons are stateless and shareable.
const iconCache = new Map<string, L.DivIcon>();
function poiIcon(emoji: string) {
  let icon = iconCache.get(emoji);
  if (!icon) {
    icon = L.divIcon({
      className: styles.poiMarker!,
      html: emoji,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -12],
    });
    iconCache.set(emoji, icon);
  }
  return icon;
}

interface PoiMarkersProps {
  selected: ReadonlySet<string>;
  onAddWaypoint: (latlng: LatLng, name: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

function PoiMarkers({ selected, onAddWaypoint, onLoadingChange }: PoiMarkersProps) {
  const { t } = useTranslation();
  const map = useMap();
  const [pois, setPois] = useState<Poi[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const fetchedBoundsRef = useRef<L.LatLngBounds | null>(null);
  // Categories the pois state was fetched for; deselecting a category only
  // filters client-side, so no request is spent on it.
  const fetchedKeysRef = useRef<ReadonlySet<string> | null>(null);
  const cooldownUntilRef = useRef(0);

  const scheduleFetch = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const delay = Math.max(POI_FETCH_DEBOUNCE_MS, cooldownUntilRef.current - Date.now());
    timerRef.current = window.setTimeout(() => {
      const bounds = map.getBounds();
      // The last fetch covered a padded area; pans within it need no new
      // request unless a category outside the fetched set was switched on.
      const covered =
        fetchedKeysRef.current !== null &&
        [...selected].every((key) => fetchedKeysRef.current!.has(key));
      if (covered && fetchedBoundsRef.current?.contains(bounds)) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const padded = bounds.pad(POI_BBOX_PAD);

      onLoadingChange(true);
      void (async () => {
        let retrying = false;
        try {
          const res = await fetch(OVERPASS_URL, {
            method: "POST",
            body: `data=${encodeURIComponent(buildOverpassQuery(padded, selected))}`,
            signal: controller.signal,
          });
          if (res.status === 429) {
            const retryAfter = Number(res.headers.get("Retry-After"));
            const waitMs =
              Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : POI_COOLDOWN_MS;
            cooldownUntilRef.current = Date.now() + waitMs;
            // Retry once the cooldown expires instead of on the next pan;
            // keep the spinner on since a fetch is still pending.
            retrying = true;
            scheduleFetch();
            return;
          }
          if (!res.ok) return;
          const data = (await res.json()) as { elements?: OverpassElement[] };
          fetchedBoundsRef.current = padded;
          fetchedKeysRef.current = new Set(selected);
          setPois(
            (data.elements ?? [])
              .map(toPoi)
              .filter((poi): poi is Poi => poi !== null),
          );
        } catch {
          // Network errors and aborted pans just keep the previous markers.
        } finally {
          // An aborted request means a newer one owns the spinner.
          if (abortRef.current === controller && !retrying) onLoadingChange(false);
        }
      })();
    }, delay);
  }, [map, onLoadingChange, selected]);

  useMapEvents({ moveend: scheduleFetch });

  useEffect(() => {
    scheduleFetch();
    return () => {
      abortRef.current?.abort();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [scheduleFetch]);

  // Don't leave the button spinning when the layer is switched off mid-fetch.
  useEffect(() => () => onLoadingChange(false), [onLoadingChange]);

  return (
    <>
      {pois
        .filter((poi) => selected.has(poi.category.labelKey))
        .map((poi) => {
          const label = t(`hiking.poi.${poi.category.labelKey}`);
          return (
            <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={poiIcon(poi.category.emoji)}>
              <Popup autoPan={false}>
                <strong>{poi.name ?? label}</strong>
                {poi.name && (
                  <>
                    <br />
                    {label}
                  </>
                )}
                {poi.openingHours && (
                  <>
                    <br />
                    {poi.openingHours}
                  </>
                )}
                {poi.website && (
                  <>
                    <br />
                    <a href={poi.website} target="_blank" rel="noreferrer">
                      {t("hiking.poiWebsite")}
                    </a>
                  </>
                )}
                <br />
                <button
                  className={styles.popupAddBtn}
                  onClick={() => onAddWaypoint({ lat: poi.lat, lng: poi.lng }, poi.name ?? label)}
                >
                  {t("hiking.addAsWaypoint")}
                </button>
              </Popup>
            </Marker>
          );
        })}
    </>
  );
}

interface Props {
  onAddWaypoint: (latlng: LatLng, name: string) => void;
}

export function PoiLayer({ onAddWaypoint }: Props) {
  const { t } = useTranslation();
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    click: () => setOpen(false),
  });

  useEffect(() => {
    const ctrl = new L.Control({ position: "topright" });
    ctrl.onAdd = () => {
      const div = document.createElement("div");
      div.className = styles.poiControl!;
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

  function toggleCategory(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const anySelected = selected.size > 0;
  const belowZoom = zoom < POI_MIN_ZOOM;

  return (
    <>
      {container &&
        createPortal(
          <>
            <button
              className={`${styles.locateBtn} ${anySelected ? styles.poiToggleActive : ""}`}
              onClick={() => setOpen((value) => !value)}
              aria-label={t("hiking.places")}
              aria-expanded={open}
              title={t("hiking.places")}
            >
              {loading ? <span className={styles.spinner} /> : <IconBinoculars size={18} />}
            </button>
            {open && (
              <div className={styles.poiCallout}>
                {CATEGORY_TOGGLES.map((category) => (
                  <label key={category.labelKey} className={styles.poiCalloutRow}>
                    <input
                      type="checkbox"
                      checked={selected.has(category.labelKey)}
                      onChange={() => toggleCategory(category.labelKey)}
                    />
                    <span aria-hidden>{category.emoji}</span>
                    <span>{t(`hiking.poi.${category.labelKey}`)}</span>
                  </label>
                ))}
              </div>
            )}
            {anySelected && belowZoom && <div className={styles.poiHint}>{t("hiking.poiZoomHint")}</div>}
          </>,
          container,
        )}
      {anySelected && !belowZoom && (
        <PoiMarkers selected={selected} onAddWaypoint={onAddWaypoint} onLoadingChange={setLoading} />
      )}
    </>
  );
}
