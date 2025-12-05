# Jetson AGX Orin Docker 배포 가이드

이 가이드는 Jetson AGX Orin 서버에서 Docker를 사용하여 서버를 배포하는 방법을 설명합니다.

## 사전 요구사항

### 1. Jetson AGX Orin 설정

```bash
# JetPack 버전 확인
cat /etc/nv_tegra_release

# Docker 설치 확인
docker --version
docker-compose --version
```

### 2. NVIDIA Container Toolkit 설치

Jetson에서 GPU를 사용하려면 NVIDIA Container Toolkit이 필요합니다:

```bash
# NVIDIA Container Toolkit 설치 (JetPack 5.x 이상)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### 3. Docker Compose 설치 (필요한 경우)

```bash
# Docker Compose v2 설치
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 또는 pip로 설치
pip3 install docker-compose
```

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성:

```bash
OPENAI_API_KEY=your_openai_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
FRONTEND_SERVER_URL=http://localhost:3000
# AGENTIC_AI_SERVER_URL은 선택사항 (기본값: http://agentic-ai-server:8002)
# Docker Compose 사용 시 자동으로 Docker 네트워크 내부 통신 사용
# 개별 배포 시에는 http://localhost:8002로 설정
AGENTIC_AI_SERVER_URL=http://agentic-ai-server:8002
STT_SERVER_URL=http://host.docker.internal:8003
FRONTEND_SERVER_URL=http://localhost:3000
```

## 배포 방법

### 방법 1: STT 서버가 호스트에서 실행 중인 경우 (현재 설정 - 컨테이너화 직전)

**현재 구성**: STT 서버는 Jetson AGX Orin 호스트에서 직접 실행되고, Frontend Server는 Docker 컨테이너에서 이를 호출합니다.

#### 설정 요약

- **STT 서버**: Jetson 호스트의 `localhost:8003`에서 실행
- **Frontend Server**: Docker 컨테이너에서 실행
- **통신**: `host.docker.internal:8003`을 통해 호스트의 STT 서버 접근
- **GPU**: STT 서버가 호스트에서 직접 GPU 접근

#### 실행 방법

```bash
# 1. STT 서버를 호스트에서 먼저 실행 (별도 터미널)
# 예: python3 stt_server.py 또는 systemd 서비스로 실행

# 2. Docker 컨테이너 실행
docker-compose up -d

# 3. 로그 확인
docker-compose logs -f
```

#### 네트워크 구성

```
Frontend Server (컨테이너)
    ↓ http://host.docker.internal:8003
호스트 네트워크 브리지
    ↓ localhost:8003
STT Server (호스트에서 실행)
```

**중요**: 
- `extra_hosts` 설정으로 `host.docker.internal`이 Linux에서도 작동합니다
- STT 서버는 호스트에서 실행되므로 GPU를 직접 접근할 수 있습니다
- 컨테이너화 전 단계로, STT 서버의 GPU 연산이 호스트에서 직접 수행됩니다

### 방법 2: STT 서버도 컨테이너화하는 경우

#### 2-1. docker-compose.yml 수정

`docker-compose.yml`에서 STT 서버 서비스를 주석 해제:

```yaml
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
```

#### 2-2. Frontend Server 환경 변수 수정

Frontend Server의 `STT_SERVER_URL`을 Docker 네트워크 내부 주소로 변경:

```yaml
# 변경 전 (호스트에서 실행)
- STT_SERVER_URL=http://host.docker.internal:8003

# 변경 후 (컨테이너화)
- STT_SERVER_URL=http://stt-server:8003
```

#### 2-3. Jetson AGX Orin에서 GPU 접근 방법

Jetson AGX Orin에서 컨테이너가 GPU에 접근하려면:

**1. NVIDIA Container Toolkit 설치 확인**
```bash
# NVIDIA Container Toolkit 설치 여부 확인
dpkg -l | grep nvidia-container-toolkit

# 설치되어 있지 않다면 설치
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**2. Docker Compose GPU 지원 확인**
```bash
# Docker Compose v2.3.0 이상 필요
docker-compose version

# GPU 테스트
docker run --rm --gpus all nvcr.io/nvidia/l4t-base:r35.2.1 nvidia-smi
```

**3. docker-compose.yml의 GPU 설정**

Docker Compose v2에서는 `deploy.resources.reservations.devices`를 사용:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

구버전 Docker Compose의 경우 `runtime: nvidia` 사용:

```yaml
runtime: nvidia
environment:
  - NVIDIA_VISIBLE_DEVICES=all
  - CUDA_VISIBLE_DEVICES=0
```

**4. 컨테이너 내부에서 GPU 확인**

```bash
# 컨테이너 실행 후 GPU 확인
docker exec -it stt-server nvidia-smi

# 또는 컨테이너 내부에서 Python으로 확인
docker exec -it stt-server python3 -c "import torch; print(torch.cuda.is_available())"
```

#### 2-4. STT 서버 컨테이너화 시 주의사항

1. **베이스 이미지 선택**: Jetson용 NVIDIA 이미지 사용 필수
   - `nvcr.io/nvidia/l4t-pytorch:r35.2.1-pth2.1-py3` (PyTorch 사용 시)
   - `nvcr.io/nvidia/l4t-tensorflow:r35.2.1-tf2.15-py3` (TensorFlow 사용 시)

2. **CUDA 버전 호환성**: JetPack 버전과 CUDA 버전 일치 확인

3. **메모리 관리**: Jetson의 제한된 메모리를 고려하여 GPU 메모리 할당 조정

4. **네트워크**: 컨테이너화 시 Docker 네트워크 내부 통신 사용 (`stt-server:8003`)

## STT 서버 Dockerfile 구성

### 기본 구조

`Dockerfile.stt`는 Jetson용 NVIDIA 베이스 이미지를 사용합니다:

```dockerfile
FROM nvcr.io/nvidia/l4t-pytorch:r35.2.1-pth2.1-py3
```

### 사용 가능한 Jetson 베이스 이미지

- **L4T Base**: `nvcr.io/nvidia/l4t-base:r35.2.1`
- **L4T PyTorch**: `nvcr.io/nvidia/l4t-pytorch:r35.2.1-pth2.1-py3`
- **L4T TensorFlow**: `nvcr.io/nvidia/l4t-tensorflow:r35.2.1-tf2.15-py3`

JetPack 버전에 맞는 태그를 선택하세요.

### GPU 지원 확인

컨테이너 내에서 GPU가 인식되는지 확인:

```bash
docker run --rm --gpus all nvcr.io/nvidia/l4t-base:r35.2.1 nvidia-smi
```

## 아키텍처 고려사항

### ARM64 빌드

Jetson AGX Orin은 ARM64 아키텍처이므로:

1. **로컬 빌드**: Jetson에서 직접 빌드 (권장)
   ```bash
   docker-compose build
   ```

2. **크로스 컴파일**: x86_64에서 빌드하려면 buildx 사용
   ```bash
   docker buildx create --use --name jetson-builder
   docker buildx build --platform linux/arm64 -t your-image:tag .
   ```

### 이미지 크기 최적화

Jetson은 스토리지가 제한적일 수 있으므로:

- 멀티 스테이지 빌드 사용
- 불필요한 패키지 제거
- `.dockerignore` 활용

## 네트워크 구성

### 현재 구성 (STT 서버 호스트 실행)

```
┌─────────────────────────────────────┐
│  Jetson AGX Orin (호스트)          │
│                                     │
│  ┌──────────────┐                  │
│  │ STT Server   │                  │
│  │ :8003        │                  │
│  └──────────────┘                  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Docker Network               │  │
│  │                              │  │
│  │  ┌──────────────────┐        │  │
│  │  │ Agentic AI       │        │  │
│  │  │ :8002            │        │  │
│  │  └──────────────────┘        │  │
│  │                              │  │
│  │  ┌──────────────────┐        │  │
│  │  │ Frontend Server  │        │  │
│  │  │ :3000            │        │  │
│  │  └──────────────────┘        │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 추후 구성 (STT 서버 컨테이너화)

```
┌─────────────────────────────────────┐
│  Jetson AGX Orin (호스트)          │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Docker Network               │  │
│  │                              │  │
│  │  ┌──────────────────┐        │  │
│  │  │ STT Server (GPU) │        │  │
│  │  │ :8003            │        │  │
│  │  └──────────────────┘        │  │
│  │                              │  │
│  │  ┌──────────────────┐        │  │
│  │  │ Agentic AI       │        │  │
│  │  │ :8002            │        │  │
│  │  └──────────────────┘        │  │
│  │                              │  │
│  │  ┌──────────────────┐        │  │
│  │  │ Frontend Server  │        │  │
│  │  │ :3000            │        │  │
│  │  └──────────────────┘        │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 문제 해결

### GPU가 인식되지 않는 경우

```bash
# NVIDIA Container Toolkit 재시작
sudo systemctl restart docker

# GPU 테스트
docker run --rm --gpus all nvcr.io/nvidia/l4t-base:r35.2.1 nvidia-smi
```

### host.docker.internal이 작동하지 않는 경우

Docker Compose v2.3.0 이상에서는 `extra_hosts` 설정이 자동으로 처리됩니다.
구버전인 경우:

```bash
# 호스트 IP 확인
ip addr show docker0 | grep inet

# docker-compose.yml에서 직접 IP 지정
extra_hosts:
  - "host.docker.internal:172.17.0.1"
```

### 메모리 부족 오류

Jetson의 메모리가 부족한 경우:

```bash
# 스왑 파일 생성 (필요한 경우)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 빌드 시간이 오래 걸리는 경우

Jetson의 CPU 성능 제한으로 빌드가 느릴 수 있습니다:

```bash
# 빌드 캐시 활용
docker-compose build --parallel

# 또는 더 강력한 머신에서 크로스 컴파일 후 이미지 전송
```

## 성능 최적화

### GPU 메모리 관리

STT 서버가 GPU를 사용하는 경우:

```yaml
environment:
  - CUDA_VISIBLE_DEVICES=0
  - CUDA_MEMORY_FRACTION=0.8
```

### 컨테이너 리소스 제한

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

## 참고 자료

- [NVIDIA Container Toolkit 문서](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)
- [Jetson Docker 이미지](https://catalog.ngc.nvidia.com/orgs/nvidia/containers/l4t-base)
- [Docker Compose GPU 지원](https://docs.docker.com/compose/gpu-support/)

