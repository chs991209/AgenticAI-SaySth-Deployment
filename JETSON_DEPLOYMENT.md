# Jetson AGX Orin 배포 가이드

이 가이드는 Jetson AGX Orin 서버에서 Docker Hub의 이미지를 받아와서 Frontend Server와 Agentic AI Server를 실행하는 방법을 설명합니다.

## 사전 준비

### 1. Docker 및 Docker Compose 설치 확인

```bash
# Docker 버전 확인
docker --version

# Docker Compose 버전 확인
docker-compose --version

# 설치되어 있지 않다면
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

### 2. Docker Hub 로그인 (선택사항)

Private repository를 사용하거나 이미지를 push할 경우에만 필요합니다:

```bash
docker login
# 사용자명: chs991209
# 비밀번호: (입력)
```

### 3. 프로젝트 파일 다운로드

Jetson AGX Orin 서버에 다음 파일들이 필요합니다:

- `docker-compose.hub.yml` (Docker Hub 이미지 사용 설정)
- `.env` (환경 변수 파일)

프로젝트를 클론하거나 필요한 파일만 다운로드하세요:

```bash
# 방법 1: Git으로 클론
git clone <repository-url>
cd AgenticAI-SaySth-Deployment

# 방법 2: 필요한 파일만 다운로드
# docker-compose.hub.yml과 .env 파일만 있으면 됩니다
```

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하세요:

```bash
# .env 파일 생성
cat > .env << EOF
# Docker Hub 사용자명 (이미지 이름에 사용)
DOCKERHUB_USERNAME=chs991209

# Agentic AI Server 환경 변수
OPENAI_API_KEY=your_openai_api_key_here

# Frontend Server 환경 변수
STT_SERVER_URL=http://host.docker.internal:8003
FRONTEND_SERVER_URL=http://localhost:3000
EOF
```

**중요**: `OPENAI_API_KEY`는 반드시 설정해야 합니다.

## Docker Hub에서 이미지 받아오기

### 방법 1: docker-compose 사용 (권장)

```bash
# 프로젝트 루트 디렉토리에서
cd /path/to/AgenticAI-SaySth-Deployment

# Docker Hub에서 이미지 가져오기
docker-compose -f docker-compose.hub.yml pull

# 이미지 확인
docker images | grep chs991209
```

### 방법 2: 개별 이미지 pull

```bash
# Agentic AI Server (ARM64)
docker pull chs991209/agentic-ai-server:arm64

# Frontend Server (ARM64)
docker pull chs991209/frontend-server:arm64

# 이미지 확인
docker images | grep chs991209
```

**참고**: Jetson AGX Orin은 ARM64 아키텍처이므로 `arm64` 태그를 사용해야 합니다.

## 서버 실행

### 방법 1: docker-compose 사용 (권장)

```bash
# 백그라운드로 실행
docker-compose -f docker-compose.hub.yml up -d

# 로그 확인
docker-compose -f docker-compose.hub.yml logs -f

# 특정 서비스 로그만 확인
docker-compose -f docker-compose.hub.yml logs -f agentic-ai-server
docker-compose -f docker-compose.hub.yml logs -f frontend-server
```

### 방법 2: 개별 컨테이너 실행

#### Agentic AI Server

```bash
docker run -d \
  --name agentic-ai-server \
  -p 8002:8002 \
  -e OPENAI_API_KEY=your_openai_api_key_here \
  --restart unless-stopped \
  chs991209/agentic-ai-server:arm64
```

#### Frontend Server

```bash
docker run -d \
  --name frontend-server \
  -p 3000:3000 \
  -e AGENTIC_AI_SERVER_URL=http://agentic-ai-server:8002 \
  -e STT_SERVER_URL=http://host.docker.internal:8003 \
  -e FRONTEND_SERVER_URL=http://localhost:3000 \
  --add-host=host.docker.internal:host-gateway \
  --restart unless-stopped \
  chs991209/frontend-server:arm64
```

**주의**: 개별 실행 시 네트워크 연결을 위해 `--network` 옵션이 필요할 수 있습니다.

## 서버 상태 확인

### 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 확인 (중지된 것 포함)
docker ps -a

# 특정 컨테이너 상세 정보
docker inspect agentic-ai-server
docker inspect frontend-server
```

### 서버 헬스체크

```bash
# Agentic AI Server 확인
curl http://localhost:8002/docs

# Frontend Server 확인
curl http://localhost:3000/api/execute
```

### 로그 확인

```bash
# 실시간 로그 확인
docker-compose -f docker-compose.hub.yml logs -f

# 최근 100줄 로그
docker-compose -f docker-compose.hub.yml logs --tail=100

# 특정 서비스 로그
docker logs agentic-ai-server
docker logs frontend-server
```

## 서버 중지 및 재시작

### 중지

```bash
# docker-compose 사용
docker-compose -f docker-compose.hub.yml down

# 개별 컨테이너 중지
docker stop agentic-ai-server frontend-server
```

### 재시작

```bash
# docker-compose 사용
docker-compose -f docker-compose.hub.yml restart

# 개별 컨테이너 재시작
docker restart agentic-ai-server
docker restart frontend-server
```

### 완전 제거

```bash
# 컨테이너와 네트워크 제거 (이미지는 유지)
docker-compose -f docker-compose.hub.yml down

# 컨테이너, 네트워크, 이미지 모두 제거
docker-compose -f docker-compose.hub.yml down --rmi all
```

## 이미지 업데이트

새 버전의 이미지가 Docker Hub에 업로드된 경우:

```bash
# 1. 기존 컨테이너 중지 및 제거
docker-compose -f docker-compose.hub.yml down

# 2. 새 이미지 가져오기
docker-compose -f docker-compose.hub.yml pull

# 3. 컨테이너 재시작
docker-compose -f docker-compose.hub.yml up -d

# 또는 한 번에
docker-compose -f docker-compose.hub.yml pull && \
docker-compose -f docker-compose.hub.yml up -d
```

## 네트워크 구성

### 현재 구성

```
┌─────────────────────────────────────────────┐
│  Jetson AGX Orin (호스트)                   │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ STT Server (호스트에서 실행)        │  │
│  │ - 포트: 8003                        │  │
│  │ - localhost:8003                    │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Docker Network                      │  │
│  │                                     │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ Agentic AI Server            │  │  │
│  │  │ (컨테이너)                    │  │  │
│  │  │ 포트: 8002                    │  │  │
│  │  │ 이미지: arm64                 │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                     │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ Frontend Server              │  │  │
│  │  │ (컨테이너)                    │  │  │
│  │  │ 포트: 3000                    │  │  │
│  │  │ 이미지: arm64                 │  │  │
│  │  │                              │  │  │
│  │  │ STT 접근:                    │  │  │
│  │  │ host.docker.internal:8003    │  │  │
│  │  └──────────────────────────────┘  │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 서버 간 통신

- **Frontend Server → Agentic AI Server**: `http://agentic-ai-server:8002` (Docker 네트워크 내부)
- **Frontend Server → STT Server**: `http://host.docker.internal:8003` (호스트 머신)
- **외부 → Frontend Server**: `http://localhost:3000` 또는 `http://<jetson-ip>:3000`
- **외부 → Agentic AI Server**: `http://localhost:8002` 또는 `http://<jetson-ip>:8002`

## 문제 해결

### 이미지 pull 실패

```bash
# 네트워크 연결 확인
ping hub.docker.com

# Docker Hub 로그인 확인
docker info | grep Username

# 수동으로 이미지 확인
docker pull chs991209/agentic-ai-server:arm64
```

### 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose -f docker-compose.hub.yml logs

# 컨테이너 상태 확인
docker ps -a

# 환경 변수 확인
docker-compose -f docker-compose.hub.yml config
```

### 포트 충돌

```bash
# 포트 사용 확인
sudo netstat -tulpn | grep -E ':(3000|8002)'

# 다른 프로세스가 사용 중이면 중지하거나 포트 변경
# docker-compose.hub.yml에서 ports 섹션 수정
```

### STT 서버 연결 실패

```bash
# STT 서버가 호스트에서 실행 중인지 확인
curl http://localhost:8003/health

# Frontend Server에서 STT 서버 접근 테스트
docker exec frontend-server ping host.docker.internal
```

### 메모리 부족

Jetson의 메모리가 부족한 경우:

```bash
# 메모리 사용량 확인
free -h

# 사용하지 않는 이미지 정리
docker image prune -a

# 컨테이너 리소스 제한 (docker-compose.hub.yml에 추가)
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

## 자동 시작 설정 (선택사항)

시스템 부팅 시 자동으로 컨테이너를 시작하려면:

### systemd 서비스 생성

```bash
# 서비스 파일 생성
sudo nano /etc/systemd/system/agentic-ai.service
```

다음 내용 추가:

```ini
[Unit]
Description=Agentic AI Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/AgenticAI-SaySth-Deployment
ExecStart=/usr/bin/docker-compose -f docker-compose.hub.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.hub.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

서비스 활성화:

```bash
sudo systemctl daemon-reload
sudo systemctl enable agentic-ai.service
sudo systemctl start agentic-ai.service
```

## 요약

### 빠른 시작 명령어

```bash
# 1. 환경 변수 설정
echo "OPENAI_API_KEY=your_key" > .env
echo "DOCKERHUB_USERNAME=chs991209" >> .env

# 2. 이미지 가져오기
docker-compose -f docker-compose.hub.yml pull

# 3. 서버 실행
docker-compose -f docker-compose.hub.yml up -d

# 4. 로그 확인
docker-compose -f docker-compose.hub.yml logs -f
```

### 주요 포트

- **Frontend Server**: 3000
- **Agentic AI Server**: 8002
- **STT Server** (호스트): 8003

### 주요 이미지

- `chs991209/agentic-ai-server:arm64`
- `chs991209/frontend-server:arm64`

## 추가 참고 자료

- [DOCKER_JETSON.md](./DOCKER_JETSON.md) - Jetson Docker 설정 상세 가이드
- [DOCKERHUB.md](./DOCKERHUB.md) - Docker Hub 사용 가이드
- [STT_SERVER_CONTAINERIZATION.md](./STT_SERVER_CONTAINERIZATION.md) - STT 서버 컨테이너화 가이드


