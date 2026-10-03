FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV HOSTNAME=0.0.0.0 PORT=3000 AFTERBELL_PUBLIC_DEMO=1 AFTERBELL_DATABASE_PATH=/app/data/afterbell.sqlite
EXPOSE 3000
CMD ["node", "server.js"]
