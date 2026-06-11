import { useMapEvents } from "react-leaflet";
import type { LatLng } from "../_types/types";

interface Props {
  onMapClick: (latlng: LatLng) => void;
  active: boolean;
}

export function MapClickHandler({ onMapClick, active }: Props) {
  useMapEvents({
    click(event) {
      if (!active) return;
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}
