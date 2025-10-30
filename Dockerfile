# 1) Node 환경에서 Vue 정적 자산 빌드
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Nginx를 최종 런타임으로 사용
FROM nginx:1.25-alpine AS runtime
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# 커스텀 Nginx 설정 및 SSL 자산 반영
COPY ci/nginx.conf /etc/nginx/nginx.conf
COPY ci/ssl /etc/nginx/ssl

# 빌드 결과를 Nginx 정적 루트에 복사
COPY --from=build /app/dist ./

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
