FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/labels/package.json ./packages/labels/
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace @dental/labels --workspace @dental/api
COPY packages/labels ./packages/labels
COPY apps/api ./apps/api
RUN npm run build -w @dental/labels && npm run build -w @dental/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/labels ./packages/labels
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/src/db/schema-postgres.sql ./apps/api/dist/db/schema-postgres.sql
COPY --from=build /app/apps/api/package.json ./apps/api/
EXPOSE 3333
CMD ["node", "apps/api/dist/index.js"]
