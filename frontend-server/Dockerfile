# Frontend Server Dockerfile
FROM node:18-alpine AS base

# 의존성 설치 단계
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public 디렉토리가 없으면 생성 (Next.js 빌드에 필요)
RUN mkdir -p public || true
RUN npm run build

# 프로덕션 단계
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Next.js 실행에 필요한 파일만 복사
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
# public 디렉토리 복사 (빌드 단계에서 생성되었으므로 항상 존재)
COPY --from=builder /app/public ./public
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/node_modules ./node_modules

# 포트 노출
EXPOSE 3000

# 서버 실행
CMD ["npm", "start"]

