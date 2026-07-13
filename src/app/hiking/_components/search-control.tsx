import { useEffect, useRef, useState } from "react";
import type { LatLngTuple } from "leaflet";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "../_styles/Hiking.module.css";

export interface SearchResult {
  lat: number;
  lng: number;
  name: string;
  label: string;
  bounds: [LatLngTuple, LatLngTuple] | null;
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
    // [minLon, maxLat, maxLon, minLat]
    extent?: [number, number, number, number];
  };
}

const PHOTON_SEARCH_URL = "https://photon.komoot.io/api/";

function toResult(feature: PhotonFeature): SearchResult {
  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties;
  const street = [props.street, props.housenumber].filter(Boolean).join(" ");
  const name = props.name ?? street;
  const label = [name, [props.postcode, props.city].filter(Boolean).join(" "), props.country]
    .filter(Boolean)
    .join(", ");
  const extent = props.extent;

  return {
    lat,
    lng,
    name: name || label,
    label,
    bounds: extent
      ? [
          [extent[3], extent[0]],
          [extent[1], extent[2]],
        ]
      : null,
  };
}

interface Props {
  onSelect: (result: SearchResult) => void;
  onClear: () => void;
  // Bumped by the parent to reset the field, e.g. after the searched
  // address has been added as a waypoint.
  clearSeq: number;
}

export function SearchControl({ onSelect, onClear, clearSeq }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const prevClearSeqRef = useRef(clearSeq);

  useEffect(() => {
    if (clearSeq === prevClearSeqRef.current) return;
    prevClearSeqRef.current = clearSeq;
    abortRef.current?.abort();
    setQuery("");
    setResults([]);
    setOpen(false);
  }, [clearSeq]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const params = new URLSearchParams({ q, limit: "6" });
          const res = await fetch(`${PHOTON_SEARCH_URL}?${params}`, { signal: controller.signal });
          if (!res.ok) throw new Error(`Search responded ${res.status}`);
          const data = (await res.json()) as { features?: PhotonFeature[] };
          setResults((data.features ?? []).map(toResult));
          setOpen(true);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResults([]);
          setOpen(true);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(result: SearchResult) {
    setQuery(result.label);
    setResults([]);
    setOpen(false);
    onSelect(result);
  }

  function handleClear() {
    abortRef.current?.abort();
    setQuery("");
    setResults([]);
    setOpen(false);
    onClear();
  }

  return (
    <div
      className={styles.searchControl}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className={styles.searchInputWrap}>
        <IconSearch size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          value={query}
          placeholder={t("hiking.searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) handleSelect(results[0]);
            if (event.key === "Escape") setOpen(false);
          }}
        />
        {query && (
          <button
            className={styles.searchClearBtn}
            onClick={handleClear}
            aria-label={t("hiking.clearSearch")}
            title={t("hiking.clearSearch")}
          >
            <IconX size={14} />
          </button>
        )}
      </div>
      {open && (
        <ul className={styles.searchResults}>
          {results.length === 0 ? (
            <li className={styles.searchNoResults}>{t("hiking.searchNoResults")}</li>
          ) : (
            results.map((result, index) => (
              <li key={`${result.lat}-${result.lng}-${index}`}>
                <button className={styles.searchResultBtn} onClick={() => handleSelect(result)}>
                  <span className={styles.searchResultName}>{result.name}</span>
                  <span className={styles.searchResultMeta}>{result.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
