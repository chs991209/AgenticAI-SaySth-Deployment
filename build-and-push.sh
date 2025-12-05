#!/bin/bash

# Docker Hub 빌드 및 푸시 스크립트
# 사용법: ./build-and-push.sh [DOCKERHUB_USERNAME]

set -e  # 오류 발생 시 스크립트 중단

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Docker Hub 사용자명 확인
if [ -z "$1" ]; then
    echo -e "${YELLOW}사용법: ./build-and-push.sh YOUR_DOCKERHUB_USERNAME${NC}"
    echo -e "${YELLOW}또는 환경 변수로 설정: export DOCKERHUB_USERNAME=your_username${NC}"
    exit 1
fi

DOCKERHUB_USERNAME=$1

# Docker Hub 로그인 확인 (선택적 - push 시도 시 자동으로 인증 요구됨)
# macOS에서는 docker info가 Username을 출력하지 않을 수 있으므로,
# 실제 push 시도 시 인증이 필요하면 자동으로 에러가 발생합니다.
if ! test -f ~/.docker/config.json; then
    echo -e "${YELLOW}경고: Docker Hub 로그인 정보를 찾을 수 없습니다.${NC}"
    echo -e "${YELLOW}로그인하지 않았다면: docker login${NC}"
    echo -e "${YELLOW}계속 진행합니다... (push 시도 시 인증이 필요하면 에러 발생)${NC}"
    echo ""
fi

echo -e "${GREEN}=== Docker Hub 이미지 빌드 및 푸시 시작 ===${NC}"
echo -e "${GREEN}Docker Hub 사용자명: ${DOCKERHUB_USERNAME}${NC}"

# 아키텍처 감지 (Jetson에서 직접 빌드 시 --platform 플래그 불필요)
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
    echo -e "${GREEN}Jetson AGX Orin (ARM64)에서 네이티브 빌드 감지${NC}"
    PLATFORM_FLAG=""
else
    echo -e "${GREEN}크로스 컴파일 모드 (--platform linux/arm64)${NC}"
    PLATFORM_FLAG="--platform linux/arm64"
fi
echo ""

# Agentic AI Server 빌드
echo -e "${GREEN}[1/4] Agentic AI Server 빌드 중...${NC}"
docker build -f Dockerfile.agentic-ai \
  ${PLATFORM_FLAG} \
  -t ${DOCKERHUB_USERNAME}/agentic-ai-server:latest \
  -t ${DOCKERHUB_USERNAME}/agentic-ai-server:arm64 \
  .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Agentic AI Server 빌드 완료${NC}"
else
    echo -e "${RED}✗ Agentic AI Server 빌드 실패${NC}"
    exit 1
fi

# Agentic AI Server 푸시
echo -e "${GREEN}[2/4] Agentic AI Server 푸시 중...${NC}"
docker push ${DOCKERHUB_USERNAME}/agentic-ai-server:latest
docker push ${DOCKERHUB_USERNAME}/agentic-ai-server:arm64

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Agentic AI Server 푸시 완료${NC}"
else
    echo -e "${RED}✗ Agentic AI Server 푸시 실패${NC}"
    exit 1
fi

# Frontend Server 빌드
echo -e "${GREEN}[3/4] Frontend Server 빌드 중...${NC}"
cd frontend-server
docker build \
  ${PLATFORM_FLAG} \
  -t ${DOCKERHUB_USERNAME}/frontend-server:latest \
  -t ${DOCKERHUB_USERNAME}/frontend-server:arm64 \
  .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend Server 빌드 완료${NC}"
else
    echo -e "${RED}✗ Frontend Server 빌드 실패${NC}"
    exit 1
fi

# Frontend Server 푸시
echo -e "${GREEN}[4/4] Frontend Server 푸시 중...${NC}"
docker push ${DOCKERHUB_USERNAME}/frontend-server:latest
docker push ${DOCKERHUB_USERNAME}/frontend-server:arm64

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend Server 푸시 완료${NC}"
else
    echo -e "${RED}✗ Frontend Server 푸시 실패${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}=== 모든 이미지가 성공적으로 푸시되었습니다! ===${NC}"
echo ""
echo -e "${YELLOW}다음 명령어로 이미지를 사용할 수 있습니다:${NC}"
echo "  docker pull ${DOCKERHUB_USERNAME}/agentic-ai-server:latest"
echo "  docker pull ${DOCKERHUB_USERNAME}/frontend-server:latest"
echo ""
echo -e "${YELLOW}docker-compose.yml에서 이미지 사용:${NC}"
echo "  image: ${DOCKERHUB_USERNAME}/agentic-ai-server:latest"
echo "  image: ${DOCKERHUB_USERNAME}/frontend-server:latest"


