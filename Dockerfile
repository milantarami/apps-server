FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm exec vite build --config vite.server.config.ts

# Only the node binary is needed at runtime, so skip the npm/yarn/corepack layers of the node image.
FROM alpine:3.24
RUN apk add --no-cache libstdc++
COPY --from=build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server/server.mjs ./server.mjs
ENV NODE_ENV=production DASHBOARD_HOST=0.0.0.0
LABEL app=push-dashboard
USER nobody
EXPOSE 5178
CMD ["node", "server.mjs"]
