FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_NAKAMA_HOST=api.xoranetwork.com
ARG NEXT_PUBLIC_NAKAMA_PORT=443
ARG NEXT_PUBLIC_NAKAMA_SSL=true
ENV NEXT_PUBLIC_NAKAMA_HOST=$NEXT_PUBLIC_NAKAMA_HOST
ENV NEXT_PUBLIC_NAKAMA_PORT=$NEXT_PUBLIC_NAKAMA_PORT
ENV NEXT_PUBLIC_NAKAMA_SSL=$NEXT_PUBLIC_NAKAMA_SSL
ENV NAKAMA_SERVER_KEY=build-placeholder
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN apk add --no-cache su-exec \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
