import { MapPin } from 'lucide-react';
import type { RejectedCheckout } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

const mapUrl = (lat: number, lng: number) => `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map`;

interface Props {
  rows: RejectedCheckout[];
}

/** Rad etilgan «Ketdim» urinishlari: kim, qachon, qayerdan (xaritada), qanday xato — joy noto'g'ri belgilanganini ko'rish uchun */
export function RejectedCheckoutsCard({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <Card title="Rad etilgan «Ketdim» urinishlari"
      description="Xodim «Ketdim»ni bosgan, lekin joyi qabul qilinmagan. Xaritada qayerda turgani ko'rinadi — joy noto'g'ri belgilangan bo'lsa, «Sozlamalar → Ketish joylari»da tuzating">
      <ul className="divide-y divide-gray-100" data-pdf-hide>
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {r.userName ?? 'Xodim'} · {formatDateTime(r.at)}
                {r.accuracy != null && <span className="text-sm font-normal text-gray-500"> · GPS ±{Math.round(r.accuracy)} m</span>}
              </p>
              <p className="text-sm text-gray-600">{r.error ?? 'Sababi yozilmagan'}</p>
            </div>
            {r.lat != null && r.lng != null && (
              <a href={mapUrl(r.lat, r.lng)} target="_blank" rel="noreferrer"
                className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                <MapPin className="h-4 w-4" />Xaritada
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
