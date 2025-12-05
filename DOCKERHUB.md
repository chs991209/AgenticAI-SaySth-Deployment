# Docker Hub 배포 가이드

이 가이드는 프로젝트의 Docker 이미지를 Docker Hub에 업로드하고 사용하는 방법을 설명합니다.

## 사전 준비

### 1. Docker Hub 계정 생성 및 로그인

```bash
# Docker Hub에 로그인
docker login

# 사용자명과 비밀번호 입력
# 또는 Personal Access Token 사용 (권장)
```

### 2. Docker Hub Personal Access Token 생성 (선택사항, 권장)

1. Docker Hub 웹사이트 접속: https://hub.docker.com
2. Account Settings → Security → New Access Token
3. 토큰 생성 후 복사
4. 로그인 시 비밀번호 대신 토큰 사용

```bash
docker login -u YOUR_USERNAME
# Password: [Personal Access Token 입력]
```

## 이미지 빌드 및 푸시

### 방법 1: 개별 이미지 빌드 및 푸시

#### Agentic AI Server

```bash
# 이미지 빌드 (Jetson AGX Orin용 ARM64)
docker build -f Dockerfile.agentic-ai \
  --platform linux/arm64 \
  -t YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest \
  -t YOUR_DOCKERHUB_USERNAME/agentic-ai-server:arm64 \
  .

# 이미지 푸시
docker push YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest
docker push YOUR_DOCKERHUB_USERNAME/agentic-ai-server:arm64
```

#### Frontend Server

```bash
# 이미지 빌드 (Jetson AGX Orin용 ARM64)
cd frontend-server
docker build \
  --platform linux/arm64 \
  -t YOUR_DOCKERHUB_USERNAME/frontend-server:latest \
  -t YOUR_DOCKERHUB_USERNAME/frontend-server:arm64 \
  .

# 이미지 푸시
docker push YOUR_DOCKERHUB_USERNAME/frontend-server:latest
docker push YOUR_DOCKERHUB_USERNAME/frontend-server:arm64
cd ..
```

### 방법 2: 스크립트를 사용한 일괄 빌드 및 푸시

프로젝트 루트에 `build-and-push.sh` 스크립트를 생성하여 사용할 수 있습니다.

## docker-compose.yml에서 Docker Hub 이미지 사용

Docker Hub에 이미지를 올린 후, `docker-compose.yml`을 수정하여 빌드 대신 이미지를 사용하도록 설정할 수 있습니다.

### 수정 전 (로컬 빌드)

```yaml
agentic-ai-server:
  build:
    context: .
    dockerfile: Dockerfile.agentic-ai
    platforms:
      - linux/arm64
```

### 수정 후 (Docker Hub 이미지 사용)

```yaml
agentic-ai-server:
  image: YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest
  # build 섹션 제거 또는 주석 처리
  # build:
  #   context: .
  #   dockerfile: Dockerfile.agentic-ai
  #   platforms:
  #     - linux/arm64
```

## 완전한 예시

### 1. docker-compose.yml 수정 (Docker Hub 이미지 사용)

```yaml
version: '3.8'

services:
  agentic-ai-server:
    image: YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest
    container_name: agentic-ai-server
    ports:
      - "8002:8002"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8002/docs').close()"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend-server:
    image: YOUR_DOCKERHUB_USERNAME/frontend-server:latest
    container_name: frontend-server
    ports:
      - "3000:3000"
    environment:
      - AGENTIC_AI_SERVER_URL=${AGENTIC_AI_SERVER_URL:-http://agentic-ai-server:8002}
      - STT_SERVER_URL=${STT_SERVER_URL:-http://host.docker.internal:8003}
      - FRONTEND_SERVER_URL=${FRONTEND_SERVER_URL:-http://localhost:3000}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - agentic-ai-server
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/execute', (r) => { process.exit(r.statusCode === 405 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하세요:

```bash
# .env 파일 생성
cat > .env << EOF
# Docker Hub 사용자명 (이미지 이름에 사용)
DOCKERHUB_USERNAME=chs991209

# Agentic AI Server 환경 변수
OPENAI_API_KEY=your_openai_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
FRONTEND_SERVER_URL=http://localhost:3000

# Frontend Server 환경 변수
# AGENTIC_AI_SERVER_URL은 선택사항 (기본값: http://agentic-ai-server:8002)
# Docker Compose 사용 시 자동으로 Docker 네트워크 내부 통신 사용
# 개별 배포 시에는 http://localhost:8002로 설정
AGENTIC_AI_SERVER_URL=http://agentic-ai-server:8002
STT_SERVER_URL=http://host.docker.internal:8003
FRONTEND_SERVER_URL=http://localhost:3000
EOF
```

**중요**: 
- `OPENAI_API_KEY`는 반드시 설정해야 합니다.
- `YOUTUBE_API_KEY`는 YouTube 비디오 검색 기능을 사용하려면 필수입니다.
- `AGENTIC_AI_SERVER_URL`은 선택사항입니다. 설정하지 않으면 기본값(`http://agentic-ai-server:8002`)이 사용됩니다.
- Docker Compose 사용 시 자동으로 Docker 네트워크 내부 통신을 사용하므로 별도 설정이 필요 없습니다.

### 3. 이미지 풀 및 실행

```bash
# Docker Hub에서 이미지 가져오기
docker-compose -f docker-compose.hub.yml pull

# 컨테이너 실행
docker-compose -f docker-compose.hub.yml up -d
```

## 빌드 및 푸시 스크립트

프로젝트 루트에 `build-and-push.sh` 스크립트를 생성하여 자동화할 수 있습니다:

```bash
#!/bin/bash

# Docker Hub 사용자명 설정
DOCKERHUB_USERNAME="YOUR_DOCKERHUB_USERNAME"

# Docker Hub 로그인 확인
if ! docker info | grep -q "Username"; then
    echo "Docker Hub에 로그인하세요: docker login"
    exit 1
fi

# Agentic AI Server 빌드 및 푸시
echo "Building Agentic AI Server..."
docker build -f Dockerfile.agentic-ai \
  --platform linux/arm64 \
  -t ${DOCKERHUB_USERNAME}/agentic-ai-server:latest \
  -t ${DOCKERHUB_USERNAME}/agentic-ai-server:arm64 \
  .

echo "Pushing Agentic AI Server..."
docker push ${DOCKERHUB_USERNAME}/agentic-ai-server:latest
docker push ${DOCKERHUB_USERNAME}/agentic-ai-server:arm64

# Frontend Server 빌드 및 푸시
echo "Building Frontend Server..."
cd frontend-server
docker build \
  --platform linux/arm64 \
  -t ${DOCKERHUB_USERNAME}/frontend-server:latest \
  -t ${DOCKERHUB_USERNAME}/frontend-server:arm64 \
  .

echo "Pushing Frontend Server..."
docker push ${DOCKERHUB_USERNAME}/frontend-server:latest
docker push ${DOCKERHUB_USERNAME}/frontend-server:arm64
cd ..

echo "모든 이미지가 성공적으로 푸시되었습니다!"
```

스크립트 실행:

```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

## 태그 전략

### 버전 관리

```bash
# 버전 태그 추가
docker tag YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest \
  YOUR_DOCKERHUB_USERNAME/agentic-ai-server:v1.0.0

docker push YOUR_DOCKERHUB_USERNAME/agentic-ai-server:v1.0.0
```

### 아키텍처별 태그

```bash
# ARM64 전용 태그
docker tag YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest \
  YOUR_DOCKERHUB_USERNAME/agentic-ai-server:arm64

# 멀티 아키텍처 지원 (추가 작업 필요)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest \
  --push .
```

## Jetson AGX Orin에서 Docker Hub 이미지 사용

### 1. 이미지 가져오기

**중요**: Jetson AGX Orin은 ARM64 아키텍처이므로, 명시적으로 `arm64` 태그를 사용하거나 `--platform linux/arm64`를 지정해야 합니다.

```bash
# 방법 1: arm64 태그 사용 (권장)
docker pull YOUR_DOCKERHUB_USERNAME/agentic-ai-server:arm64
docker pull YOUR_DOCKERHUB_USERNAME/frontend-server:arm64

# 방법 2: --platform 옵션 사용
docker pull --platform linux/arm64 YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest
docker pull --platform linux/arm64 YOUR_DOCKERHUB_USERNAME/frontend-server:latest

# 주의: latest 태그만 사용하면 호스트 아키텍처에 따라 다를 수 있음
# Jetson에서는 자동으로 ARM64를 선택하지만, 명시적으로 지정하는 것이 안전함
```

### 2. docker-compose.yml 사용

```bash
# docker-compose.yml에서 이미지 사용 설정 후
docker-compose pull
docker-compose up -d
```

## 주의사항

### 1. 이미지 크기

- Jetson은 스토리지가 제한적일 수 있으므로 불필요한 이미지는 정리
- 멀티 스테이지 빌드로 이미지 크기 최소화

```bash
# 사용하지 않는 이미지 정리
docker image prune -a
```

### 2. 보안

- `.env` 파일이나 API 키는 이미지에 포함하지 않음
- 환경 변수로 런타임에 주입
- `.dockerignore` 파일 확인

### 3. Private Repository

민감한 코드가 포함된 경우 Private Repository 사용:

```bash
# Private repository로 푸시
docker push YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest

# Private repository 접근 시 로그인 필요
docker login
docker pull YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest
```

## 문제 해결

### 푸시 실패

```bash
# 로그인 상태 확인
docker info | grep Username

# 다시 로그인
docker logout
docker login
```

### 권한 오류

```bash
# Docker Hub 계정 권한 확인
# Repository가 Private인 경우 접근 권한 필요
```

### 네트워크 오류

```bash
# 프록시 설정 (필요한 경우)
docker login --username YOUR_USERNAME --password YOUR_PASSWORD
```

## CI/CD 통합 (선택사항)

GitHub Actions 등을 사용하여 자동 빌드 및 푸시 설정 가능:

```yaml
# .github/workflows/docker-push.yml 예시
name: Build and Push Docker Images

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1
      - name: Login to Docker Hub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: .
          file: ./Dockerfile.agentic-ai
          platforms: linux/arm64
          push: true
          tags: YOUR_DOCKERHUB_USERNAME/agentic-ai-server:latest
```

## 요약

1. **Docker Hub 로그인**: `docker login`
2. **이미지 빌드**: `docker build --platform linux/arm64 -t USERNAME/image:tag .`
3. **이미지 푸시**: `docker push USERNAME/image:tag`
4. **docker-compose.yml 수정**: `build` → `image` 변경
5. **이미지 사용**: `docker-compose pull && docker-compose up -d`

