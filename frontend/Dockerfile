# Build
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* /app/
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi

COPY . /app
RUN npm run build

# Serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
