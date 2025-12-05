# STT 서버 컨테이너화 가이드 (Jetson AGX Orin)

이 문서는 Jetson AGX Orin에서 STT 서버를 컨테이너화하는 방법을 설명합니다.

## 현재 상태 (컨테이너화 직전)

### 현재 구성

```
┌─────────────────────────────────────────────┐
│  Jetson AGX Orin (호스트)                   │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ STT Server (호스트에서 실행)        │  │
│  │ - 포트: 8003                        │  │
│  │ - GPU 직접 접근                     │  │
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
│  │  └──────────────────────────────┘  │  │
│  │                                     │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ Frontend Server              │  │  │
│  │  │ (컨테이너)                    │  │  │
│  │  │ 포트: 3000                    │  │  │
│  │  │                              │  │  │
│  │  │ STT 접근:                    │  │  │
│  │  │ host.docker.internal:8003    │  │  │
│  │  └──────────────────────────────┘  │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 현재 설정 요약

- **STT 서버**: Jetson 호스트에서 직접 실행 (localhost:8003)
- **Frontend Server**: Docker 컨테이너에서 실행
- **통신**: `host.docker.internal:8003`을 통해 호스트의 STT 서버 접근
- **GPU**: STT 서버가 호스트에서 직접 GPU 접근

## STT 서버 컨테이너화 방법

### 1. 사전 준비

#### 1-1. NVIDIA Container Toolkit 설치

```bash
# JetPack 버전 확인
cat /etc/nv_tegra_release

# NVIDIA Container Toolkit 설치
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Docker 재시작
sudo systemctl restart docker
```

#### 1-2. GPU 접근 테스트

```bash
# GPU가 컨테이너에서 접근 가능한지 테스트
docker run --rm --gpus all nvcr.io/nvidia/l4t-base:r35.2.1 nvidia-smi

# 출력 예시:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.xx.xx    Driver Version: 535.xx.xx    CUDA Version: 12.x   |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  Orin          Off        | 00000000:00:1E.0 Off |                    0 |
# |  0%   45C    P0    15W /  60W |      0MiB / 32768MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+
```

### 2. STT 서버 Dockerfile 준비

#### 2-1. Dockerfile.stt 구조

```dockerfile
# Jetson AGX Orin용 STT 서버 Dockerfile
FROM nvcr.io/nvidia/l4t-pytorch:r35.2.1-pth2.1-py3

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    python3-pip \
    libasound2-dev \
    portaudio19-dev \
    libsndfile1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY stt-server/requirements.txt ./requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

# STT 서버 코드 복사
COPY stt-server/ ./

# 포트 노출
EXPOSE 8003

# GPU 환경 변수
ENV CUDA_VISIBLE_DEVICES=0
ENV PYTHONUNBUFFERED=1

# 서버 실행
CMD ["python3", "stt_server.py"]
```

#### 2-2. 베이스 이미지 선택 가이드

Jetson AGX Orin의 JetPack 버전에 맞는 이미지 선택:

| JetPack 버전 | PyTorch 이미지 | TensorFlow 이미지 |
|-------------|---------------|-------------------|
| 5.1.x | `r35.2.1-pth2.1-py3` | `r35.2.1-tf2.15-py3` |
| 5.0.x | `r35.1.0-pth2.0-py3` | `r35.1.0-tf2.12-py3` |

### 3. docker-compose.yml 수정

#### 3-1. STT 서버 서비스 활성화

```yaml
# docker-compose.yml에서 주석 해제
stt-server:
  build:
    context: ./stt-server
    dockerfile: Dockerfile.stt
    platforms:
      - linux/arm64
  container_name: stt-server
  ports:
    - "8003:8003"
  environment:
    - CUDA_VISIBLE_DEVICES=0
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8003/health"] || exit 1
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

#### 3-2. Frontend Server 환경 변수 변경

```yaml
frontend-server:
  environment:
    # 변경 전
    # - STT_SERVER_URL=http://host.docker.internal:8003
    
    # 변경 후 (Docker 네트워크 내부 통신)
    - STT_SERVER_URL=http://stt-server:8003
```

### 4. 컨테이너화 후 구성

```
┌─────────────────────────────────────────────┐
│  Jetson AGX Orin (호스트)                   │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Docker Network                      │  │
│  │                                     │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ STT Server                   │  │  │
│  │  │ (컨테이너)                    │  │  │
│  │  │ 포트: 8003                    │  │  │
│  │  │ GPU 접근: NVIDIA Container   │  │  │
│  │  │          Toolkit 통해        │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                     │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ Agentic AI Server            │  │  │
│  │  │ (컨테이너)                    │  │  │
│  │  │ 포트: 8002                    │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                     │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ Frontend Server              │  │  │
│  │  │ (컨테이너)                    │  │  │
│  │  │ 포트: 3000                    │  │  │
│  │  │                              │  │  │
│  │  │ STT 접근:                    │  │  │
│  │  │ stt-server:8003              │  │  │
│  │  └──────────────────────────────┘  │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Jetson AGX Orin에서 GPU 접근 원리

### 1. NVIDIA Container Toolkit의 역할

NVIDIA Container Toolkit은 Docker 컨테이너가 호스트의 NVIDIA GPU에 접근할 수 있도록 해주는 도구입니다.

**작동 원리:**
1. Docker가 컨테이너를 시작할 때 NVIDIA 런타임을 사용
2. 호스트의 GPU 디바이스 파일(`/dev/nvidia*`)을 컨테이너에 마운트
3. CUDA 라이브러리와 드라이버를 컨테이너 내부에서 사용 가능하도록 설정

### 2. Docker Compose GPU 설정

#### Docker Compose v2 (권장)

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

이 설정은:
- `driver: nvidia`: NVIDIA GPU 드라이버 사용
- `count: 1`: GPU 1개 할당
- `capabilities: [gpu]`: GPU 기능 활성화

#### 구버전 Docker Compose

```yaml
runtime: nvidia
environment:
  - NVIDIA_VISIBLE_DEVICES=all
  - CUDA_VISIBLE_DEVICES=0
```

### 3. 컨테이너 내부 GPU 확인

```bash
# 컨테이너 실행
docker-compose up -d stt-server

# GPU 확인
docker exec -it stt-server nvidia-smi

# Python에서 CUDA 확인
docker exec -it stt-server python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU count: {torch.cuda.device_count()}')"
```

## 문제 해결

### GPU가 인식되지 않는 경우

```bash
# 1. NVIDIA Container Toolkit 설치 확인
dpkg -l | grep nvidia-container-toolkit

# 2. Docker 데몬 재시작
sudo systemctl restart docker

# 3. GPU 테스트
docker run --rm --gpus all nvcr.io/nvidia/l4t-base:r35.2.1 nvidia-smi

# 4. Docker Compose 버전 확인 (v2.3.0 이상 필요)
docker-compose version
```

### 메모리 부족 오류

Jetson의 제한된 메모리를 고려:

```yaml
environment:
  - CUDA_MEMORY_FRACTION=0.8  # GPU 메모리의 80%만 사용
```

### 네트워크 연결 문제

```bash
# 컨테이너 간 통신 확인
docker exec -it frontend-server ping stt-server

# STT 서버 헬스체크
docker exec -it frontend-server curl http://stt-server:8003/health
```

## 성능 최적화

### 1. GPU 메모리 관리

```yaml
environment:
  - CUDA_VISIBLE_DEVICES=0
  - CUDA_MEMORY_FRACTION=0.8
  - PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

### 2. 컨테이너 리소스 제한

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

## 마이그레이션 체크리스트

- [ ] NVIDIA Container Toolkit 설치
- [ ] GPU 접근 테스트 성공
- [ ] STT 서버 Dockerfile 작성
- [ ] docker-compose.yml에서 STT 서버 서비스 활성화
- [ ] Frontend Server의 STT_SERVER_URL 변경
- [ ] 컨테이너 빌드 및 실행 테스트
- [ ] GPU 인식 확인
- [ ] STT 서버 기능 테스트
- [ ] 전체 시스템 통합 테스트


