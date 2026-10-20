# Ideal Dizayn ERP — Frontend

React 19 · TypeScript · Vite · Tailwind CSS 4 · TanStack Query · Recharts

Backend: `../backend` (Fastify + PostgreSQL). Barcha ma'lumotlar `/api/v1` orqali olinadi — mock yo'q.

## Ishga tushirish

```bash
# 1. Backend (alohida terminalda)
cd ../backend && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev   # :4000

# 2. Frontend
pnpm install
pnpm dev        # http://localhost:5173  (/api va /uploads → backend'ga proksi)
```

Demo kirish (seed): `+998900000001` direktor, `...002` menejer, `...003` dizayner, `...005` pechatnik, `...010` ustanovkachi — parol `ideal12345`. Dev rejimida login sahifasida tez to'ldirish tugmalari bor.

## Production

`pnpm build` → `dist/`. Nginx'da `dist/` ni statik bering va `/api`, `/uploads` ni backend'ga proksi qiling
(yoki API boshqa domenda bo'lsa `VITE_API_URL=https://api...` bilan build qiling). Backend `.env` dagi
`PUBLIC_APP_URL` frontend manziliga teng bo'lishi kerak — mijozga yuboriladigan tasdiqlash havolasi shundan tuziladi.

## Tuzilma

```
src/api/          client.ts (fetch, token, xatolar) · index.ts (barcha endpoint'lar)
src/types/        backend javoblari bilan bir xil turlar
src/lib/          auth (AuthProvider, RequireRole), labels (o'zbekcha nomlar), utils (format)
src/components/   ui/ (Button, Input, Select, Modal, Toast...) · orders/ · design/ · installation/ · clients/
src/pages/        har bir bo'lim sahifasi
```

## Rollar va sahifalar

| Rol | Sahifalar |
|---|---|
| Direktor | hammasi + Xodimlar va oylik, Sozlamalar |
| Menejer | Bosh sahifa, Buyurtmalar, Kalkulyator, Dizayn, Ishlab chiqarish, O'rnatish, Mijozlar, Ombor, Moliya, Hujjatlar |
| Dizayner | Dizayn (faqat o'z vazifalari, narxlarsiz) |
| Pechatnik | Ishlab chiqarish, Ombor |
| Ustanovkachi | O'rnatish — telefon uchun moslangan |

Mijoz `/approve/:token` sahifasini login'siz ochadi.
