# Docker 배포 가이드

이 프로젝트는 Docker를 사용하여 두 개의 서버를 배포할 수 있습니다:
- **Agentic AI Server** (Python/FastAPI) - 포트 8002
- **Frontend Server** (Next.js) - 포트 3000

## 사전 요구사항

- Docker 및 Docker Compose 설치
- OpenAI API Key

## 빠른 시작

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
OPENAI_API_KEY=your_openai_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
# AGENTIC_AI_SERVER_URL은 선택사항 (기본값: http://agentic-ai-server:8002)
# Docker Compose 사용 시 자동으로 Docker 네트워크 내부 통신 사용
# 개별 배포 시에는 http://localhost:8002로 설정
AGENTIC_AI_SERVER_URL=http://agentic-ai-server:8002
STT_SERVER_URL=http://host.docker.internal:8003
FRONTEND_SERVER_URL=http://localhost:3000
```

### 2. 프로덕션 모드로 실행

```bash
# 이미지 빌드 및 컨테이너 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 컨테이너 중지
docker-compose down
```

### 3. 개발 모드로 실행 (코드 변경 시 자동 반영)

```bash
# 개발 모드로 실행
docker-compose -f docker-compose.dev.yml up

# 백그라운드 실행
docker-compose -f docker-compose.dev.yml up -d
```

## 개별 서버 배포

### Agentic AI Server만 배포

```bash
# 이미지 빌드
docker build -f Dockerfile.agentic-ai -t agentic-ai-server:latest .

# 컨테이너 실행
docker run -d \
  --name agentic-ai-server \
  -p 8002:8002 \
  -e OPENAI_API_KEY=your_openai_api_key_here \
  -e YOUTUBE_API_KEY=your_youtube_api_key_here \
  agentic-ai-server:latest
```

### Frontend Server만 배포

```bash
# 이미지 빌드
cd frontend-server
docker build -t frontend-server:latest .

# 컨테이너 실행
docker run -d \
  --name frontend-server \
  -p 3000:3000 \
  -e AGENTIC_AI_SERVER_URL=http://localhost:8002 \
  -e STT_SERVER_URL=http://host.docker.internal:8003 \
  -e FRONTEND_SERVER_URL=http://localhost:3000 \
  frontend-server:latest
```

## 환경 변수 설명

### Agentic AI Server
- `OPENAI_API_KEY` (필수): OpenAI API 키
- `YOUTUBE_API_KEY` (필수): YouTube Data API v3 키 (YouTube 비디오 검색 기능 사용 시)
- `FRONTEND_SERVER_URL` (선택): Frontend 서버 URL (callback URL이 제공되지 않을 때 사용)
  - 기본값: `http://localhost:3000`
  - callback_url이 요청에 포함되지 않으면 자동으로 `${FRONTEND_SERVER_URL}/execute-voice-callback`을 사용

### Frontend Server
- `AGENTIC_AI_SERVER_URL` (선택): Agentic AI 서버 URL
  - 기본값: `http://agentic-ai-server:8002` (`.env`에 설정하지 않을 경우, Docker Compose 사용 시)
  - Docker Compose 사용 시: 자동으로 Docker 네트워크 내부 통신 사용 (서비스 이름으로 DNS 해석)
  - 개별 배포 시: `http://localhost:8002` 또는 실제 서버 주소로 설정 필요
  - `.env` 파일에서 설정하거나 환경 변수로 전달 가능
- `STT_SERVER_URL` (선택): STT 서버 URL (기본값: `http://host.docker.internal:8003`)
- `FRONTEND_SERVER_URL` (선택): Frontend 서버 URL (기본값: `http://localhost:3000`)

## 네트워크 구성

Docker Compose를 사용하면 두 서버가 자동으로 같은 네트워크에 연결되어 서로 통신할 수 있습니다.

- **Agentic AI Server**: Docker 컨테이너 내부에서 실행 (포트 8002)
- **Frontend Server**: Docker 컨테이너 내부에서 실행 (포트 3000)
- **STT Server**: Docker 외부에서 실행되어야 함 (포트 8003, 호스트 머신)

### 서버 간 통신
- Frontend Server는 `http://agentic-ai-server:8002`로 Agentic AI Server에 접근 (Docker 네트워크 내부)
- Frontend Server는 `http://host.docker.internal:8003`으로 STT Server에 접근 (호스트 머신)
- 외부에서는 `http://localhost:3000` (Frontend)과 `http://localhost:8002` (Agentic AI)로 접근

**참고**: `host.docker.internal`은 Windows/Mac에서는 자동으로 작동하지만, Linux에서는 Docker 20.10 이상이 필요하거나 `--add-host=host.docker.internal:host-gateway` 옵션이 필요합니다.

## 문제 해결

### 포트가 이미 사용 중인 경우

다른 포트를 사용하려면 `docker-compose.yml`의 포트 매핑을 수정하세요:

```yaml
ports:
  - "8003:8002"  # 호스트:컨테이너
```

### 컨테이너 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f agentic-ai-server
docker-compose logs -f frontend-server
```

### 컨테이너 재시작

```bash
# 특정 서비스 재시작
docker-compose restart agentic-ai-server

# 모든 서비스 재시작
docker-compose restart
```

### 이미지 재빌드

```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 특정 서비스만 재빌드
docker-compose build --no-cache agentic-ai-server
```

### 컨테이너 내부 접속

```bash
# Agentic AI Server
docker exec -it agentic-ai-server bash

# Frontend Server
docker exec -it frontend-server sh
```

## 프로덕션 배포 팁

1. **환경 변수 보안**: `.env` 파일을 Git에 커밋하지 마세요. 프로덕션에서는 Docker secrets나 환경 변수 관리 도구를 사용하세요.

2. **리소스 제한**: `docker-compose.yml`에 리소스 제한을 추가할 수 있습니다:

```yaml
services:
  agentic-ai-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

3. **로깅**: 프로덕션에서는 로그 드라이버를 설정하는 것을 권장합니다.

4. **헬스체크**: 현재 설정된 헬스체크가 정상 작동하는지 확인하세요.

## 참고

- Agentic AI Server는 Python 3.12를 사용합니다
- Frontend Server는 Node.js 18을 사용합니다
- **STT Server는 별도로 실행해야 합니다** (현재 Docker 설정에 포함되지 않음)
  - STT Server는 호스트 머신에서 포트 8003으로 실행되어야 합니다
  - Docker 컨테이너는 `host.docker.internal:8003`을 통해 STT Server에 접근합니다
  - Linux에서는 `host.docker.internal`이 작동하지 않을 수 있으므로, `--add-host=host.docker.internal:host-gateway` 옵션을 사용하거나 호스트 IP를 직접 지정해야 합니다

