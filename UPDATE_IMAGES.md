# Docker 이미지 업데이트 가이드

CORS 설정 등 코드 변경 후 Docker 이미지를 업데이트하는 방법입니다.

## 빠른 업데이트 프로세스

### 1. 로컬에서 (개발 서버)

#### Step 1: 코드 변경 및 커밋 (선택사항)
```bash
# 변경사항 확인
git status

# 변경사항 커밋 (선택사항)
git add .
git commit -m "Add CORS support to frontend-server"
git push
```

#### Step 2: Docker 이미지 빌드 및 푸시
```bash
# Docker Hub 사용자명 설정
export DOCKERHUB_USERNAME=your_username

# 또는 스크립트에 직접 전달
./build-and-push.sh your_username
```

이 스크립트는 다음을 수행합니다:
- Agentic AI Server 이미지 빌드 및 푸시
- Frontend Server 이미지 빌드 및 푸시

### 2. 서버에서 (Jetson 등 배포 서버)

#### Step 1: 새 이미지 가져오기
```bash
# Docker Hub 사용자명 설정
export DOCKERHUB_USERNAME=your_username

# 새 이미지 pull
docker-compose -f docker-compose.hub.yml pull
```

#### Step 2: 컨테이너 재시작 (업데이트 적용)
```bash
# 컨테이너 재시작 (새 이미지로 교체)
docker-compose -f docker-compose.hub.yml up -d --force-recreate
```

또는 더 간단하게:
```bash
# 한 번에 pull + 재시작
docker-compose -f docker-compose.hub.yml pull && \
docker-compose -f docker-compose.hub.yml up -d --force-recreate
```

## 전체 워크플로우 예시

### 개발 환경 (로컬)

```bash
# 1. 코드 변경 완료 (예: CORS 추가)

# 2. Git 커밋 (선택사항)
git add frontend-server/lib/cors.ts frontend-server/pages/api/*.ts
git commit -m "Add CORS support for cross-origin requests"
git push

# 3. Docker 이미지 빌드 및 푸시
./build-and-push.sh your_username
```

### 배포 서버 (Jetson)

```bash
# 1. 새 이미지 가져오기 및 재시작
docker-compose -f docker-compose.hub.yml pull && \
docker-compose -f docker-compose.hub.yml up -d --force-recreate

# 2. 로그 확인
docker-compose -f docker-compose.hub.yml logs -f frontend-server
```

## 주의사항

### 1. 다운타임 최소화

컨테이너를 재시작하면 잠깐의 다운타임이 발생합니다. 무중단 업데이트를 원한다면:

```bash
# 새 이미지 pull (기존 컨테이너는 계속 실행)
docker-compose -f docker-compose.hub.yml pull

# 새 컨테이너 시작 (포트는 다르게)
docker-compose -f docker-compose.hub.yml up -d --scale frontend-server=2

# 기존 컨테이너 중지
docker-compose -f docker-compose.hub.yml stop frontend-server
docker-compose -f docker-compose.hub.yml rm -f frontend-server

# 새 컨테이너로 교체
docker-compose -f docker-compose.hub.yml up -d
```

### 2. 환경 변수 확인

업데이트 후 환경 변수가 올바르게 설정되었는지 확인:

```bash
# 컨테이너 환경 변수 확인
docker exec frontend-server env | grep -E "AGENTIC_AI_SERVER_URL|STT_SERVER_URL|FRONTEND_SERVER_URL"
```

### 3. Health Check 확인

컨테이너가 정상적으로 시작되었는지 확인:

```bash
# 컨테이너 상태 확인
docker-compose -f docker-compose.hub.yml ps

# Health check 로그 확인
docker inspect frontend-server | grep -A 10 Health
```

## 자동화 스크립트

### update-images.sh (서버에서 사용)

```bash
#!/bin/bash
# 서버에서 이미지 업데이트를 위한 스크립트

set -e

DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-chs991209}

echo "=== Docker 이미지 업데이트 시작 ==="
echo "Docker Hub 사용자명: $DOCKERHUB_USERNAME"

# 새 이미지 가져오기
echo "새 이미지 가져오는 중..."
docker-compose -f docker-compose.hub.yml pull

# 컨테이너 재시작
echo "컨테이너 재시작 중..."
docker-compose -f docker-compose.hub.yml up -d --force-recreate

# 상태 확인
echo ""
echo "=== 컨테이너 상태 ==="
docker-compose -f docker-compose.hub.yml ps

echo ""
echo "=== 업데이트 완료 ==="
```

사용법:
```bash
chmod +x update-images.sh
export DOCKERHUB_USERNAME=your_username
./update-images.sh
```

## 문제 해결

### 이미지가 업데이트되지 않는 경우

```bash
# 캐시 무시하고 강제 pull
docker-compose -f docker-compose.hub.yml pull --no-cache

# 기존 컨테이너 완전히 제거 후 재시작
docker-compose -f docker-compose.hub.yml down
docker-compose -f docker-compose.hub.yml pull
docker-compose -f docker-compose.hub.yml up -d
```

### 컨테이너가 시작되지 않는 경우

```bash
# 로그 확인
docker-compose -f docker-compose.hub.yml logs frontend-server

# 컨테이너 직접 실행하여 디버깅
docker run -it --rm \
  -p 3000:3000 \
  -e AGENTIC_AI_SERVER_URL=http://agentic-ai-server:8002 \
  -e STT_SERVER_URL=http://host.docker.internal:8003 \
  -e FRONTEND_SERVER_URL=http://localhost:3000 \
  your_username/frontend-server:arm64
```

## 요약

**로컬에서:**
1. 코드 변경
2. `./build-and-push.sh your_username` 실행

**서버에서:**
1. `docker-compose -f docker-compose.hub.yml pull`
2. `docker-compose -f docker-compose.hub.yml up -d --force-recreate`

이렇게 하면 간단하게 이미지를 업데이트할 수 있습니다!


