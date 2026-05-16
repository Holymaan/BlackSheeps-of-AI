# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (cached layer).
COPY package.json package-lock.json* ./
RUN npm install

# The Mapbox token must be available at build time because Vite bakes it into
# the JS bundle.  Pass it as a build-arg from docker-compose.
ARG VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

COPY . .
RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Static assets
COPY --from=build /app/dist /usr/share/nginx/html

# nginx config: SPA fallback + API proxy to the backend container
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
