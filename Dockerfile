# Ideal Dizayn frontend — statik fayllar Caddy ichida
FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Bo'sh — API shu domenda (/api/v1)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

FROM caddy:2.10-alpine
COPY --from=build /app/dist /srv
