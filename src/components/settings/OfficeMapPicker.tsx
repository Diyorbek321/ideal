import React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Ofis belgilanmagan bo'lsa xarita Angren markazida ochiladi */
const DEFAULT_CENTER: L.LatLngTuple = [41.0167, 70.1436];

const pin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#DC0011;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

type Props = {
  lat: number | null;
  lng: number | null;
  radius: number;
  onChange: (lat: number, lng: number) => void;
};

/** Direktor ofis nuqtasini xaritadan tanlaydi: bosish yoki belgini sudrash. Doira — ruxsat etilgan masofa */
export default function OfficeMapPicker({ lat, lng, radius, onChange }: Props) {
  const box = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<L.Map | null>(null);
  const marker = React.useRef<L.Marker | null>(null);
  const circle = React.useRef<L.Circle | null>(null);
  const change = React.useRef(onChange);
  change.current = onChange;

  React.useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { center: DEFAULT_CENTER, zoom: 14 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => change.current(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => { m.remove(); map.current = null; marker.current = null; circle.current = null; };
  }, []);

  // Tashqaridan (qo'lda kiritish, «Hozirgi joylashuv») kelgan nuqtani xaritada ko'rsatish
  React.useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      marker.current?.remove(); marker.current = null;
      circle.current?.remove(); circle.current = null;
      return;
    }
    const at: L.LatLngTuple = [lat, lng];
    if (!marker.current) {
      marker.current = L.marker(at, { icon: pin, draggable: true }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        change.current(p.lat, p.lng);
      });
      m.setView(at, Math.max(m.getZoom(), 17));
    } else {
      marker.current.setLatLng(at);
    }
    const r = radius > 0 ? radius : 0;
    if (!circle.current) circle.current = L.circle(at, { radius: r, color: '#DC0011', weight: 2, fillOpacity: 0.12 }).addTo(m);
    else circle.current.setLatLng(at).setRadius(r);
  }, [lat, lng, radius]);

  return <div ref={box} className="relative z-0 h-72 w-full overflow-hidden rounded-xl border border-gray-200 sm:h-80" />;
}
