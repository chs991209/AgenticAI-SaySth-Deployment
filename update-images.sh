#!/bin/bash
# 서버에서 Docker 이미지를 업데이트하는 스크립트
# 사용법: ./update-images.sh [DOCKERHUB_USERNAME]

set -e  # 오류 발생 시 스크립트 중단

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Docker Hub 사용자명 확인
if [ -z "$1" ] && [ -z "$DOCKERHUB_USERNAME" ]; then
    echo -e "${YELLOW}사용법: ./update-images.sh YOUR_DOCKERHUB_USERNAME${NC}"
    echo -e "${YELLOW}또는 환경 변수로 설정: export DOCKERHUB_USERNAME=your_username${NC}"
    exit 1
fi

DOCKERHUB_USERNAME=${1:-$DOCKERHUB_USERNAME}

echo -e "${GREEN}=== Docker 이미지 업데이트 시작 ===${NC}"
echo -e "${GREEN}Docker Hub 사용자명: ${DOCKERHUB_USERNAME}${NC}"
echo ""

# docker-compose.hub.yml 파일 확인
if [ ! -f "docker-compose.hub.yml" ]; then
    echo -e "${RED}오류: docker-compose.hub.yml 파일을 찾을 수 없습니다.${NC}"
    exit 1
fi

# 기존 컨테이너 정리 (다른 compose 파일로 실행 중인 경우 대비)
echo -e "${YELLOW}[0/3] 기존 컨테이너 정리 중...${NC}"
# 모든 docker-compose 파일로 실행 중인 컨테이너 정리
docker-compose -f docker-compose.hub.yml down 2>/dev/null || true
docker-compose -f docker-compose.yml down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# 기존 컨테이너가 있으면 제거 (이름으로 직접 제거)
if docker ps -a --format '{{.Names}}' | grep -qE '^(agentic-ai-server|frontend-server|agentic-ai-server-dev|frontend-server-dev)$'; then
    echo -e "${YELLOW}기존 컨테이너 제거 중...${NC}"
    docker rm -f agentic-ai-server agentic-ai-server-dev frontend-server frontend-server-dev 2>/dev/null || true
fi

echo ""

# 새 이미지 가져오기
echo -e "${GREEN}[1/3] 새 이미지 가져오는 중...${NC}"
docker-compose -f docker-compose.hub.yml pull

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 이미지 가져오기 완료${NC}"
else
    echo -e "${RED}✗ 이미지 가져오기 실패${NC}"
    exit 1
fi

echo ""

# 컨테이너 시작
echo -e "${GREEN}[2/3] 컨테이너 시작 중...${NC}"
docker-compose -f docker-compose.hub.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 컨테이너 시작 완료${NC}"
else
    echo -e "${RED}✗ 컨테이너 시작 실패${NC}"
    exit 1
fi

echo ""

# 컨테이너 상태 확인
echo -e "${GREEN}[3/3] 컨테이너 상태 확인 중...${NC}"
sleep 2

echo ""
echo -e "${GREEN}=== 컨테이너 상태 ===${NC}"
docker-compose -f docker-compose.hub.yml ps

echo ""
echo -e "${GREEN}=== 업데이트 완료! ===${NC}"
echo ""
echo -e "${YELLOW}로그 확인:${NC}"
echo "  docker-compose -f docker-compose.hub.yml logs -f frontend-server"
echo "  docker-compose -f docker-compose.hub.yml logs -f agentic-ai-server"

