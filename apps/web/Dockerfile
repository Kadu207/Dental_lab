# Build SPA embedded (base /lab/) para servir atrás do nginx do Excellence
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
RUN npm install --workspace @dental/web

COPY apps/web ./apps/web
WORKDIR /app/apps/web

# Modo embedded: API via /lab-api/ no mesmo domínio do ERP
ENV VITE_DENTAL_LAB_EMBEDDED=true
ENV VITE_DENTAL_LAB_DEPLOYMENT_MODE=embedded
ENV VITE_DENTAL_LAB_BASE_PATH=/lab/
ENV VITE_DENTAL_LAB_API_URL=

RUN npm run build -- --mode embedded

FROM nginx:1.27-alpine
COPY apps/web/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
