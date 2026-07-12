# ---- build ----------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /fe
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- serve ------------------------------------------------------------------
FROM nginx:1.27-alpine AS app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /fe/dist /usr/share/nginx/html

EXPOSE 80
