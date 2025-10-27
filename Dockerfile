# 베이스 이미지로 공식 Bun 사용
FROM oven/bun:latest AS base
WORKDIR /usr/src/app

# 의존성 설치 단계: 캐싱을 위해 먼저 package.json + bun.lock 복사
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 앱 복사 및 빌드 단계
FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build    # 프론트엔드 빌드 혹은 백엔드 빌드 스크립트 실행

# 최종 이미지
FROM base AS release
WORKDIR /usr/src/app
RUN ls -R /usr/src/app 
RUN pwd
COPY --from=build /usr/src/app ./    # 빌드된 파일 및 필요 파일 복사
# production 의존성만 다시 설치 (선택사항)
RUN rm -rf node_modules \
    && bun install --frozen-lockfile --production
EXPOSE 3000
CMD ["bun", "run", "start"]   # entry point 수정 필요할 수 있음