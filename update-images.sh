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

# 새 이미지 가져오기
echo -e "${GREEN}[1/2] 새 이미지 가져오는 중...${NC}"
docker-compose -f docker-compose.hub.yml pull

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 이미지 가져오기 완료${NC}"
else
    echo -e "${RED}✗ 이미지 가져오기 실패${NC}"
    exit 1
fi

echo ""

# 컨테이너 재시작
echo -e "${GREEN}[2/2] 컨테이너 재시작 중...${NC}"
docker-compose -f docker-compose.hub.yml up -d --force-recreate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 컨테이너 재시작 완료${NC}"
else
    echo -e "${RED}✗ 컨테이너 재시작 실패${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 컨테이너 상태 ===${NC}"
docker-compose -f docker-compose.hub.yml ps

echo ""
echo -e "${GREEN}=== 업데이트 완료! ===${NC}"
echo ""
echo -e "${YELLOW}로그 확인:${NC}"
echo "  docker-compose -f docker-compose.hub.yml logs -f frontend-server"
echo "  docker-compose -f docker-compose.hub.yml logs -f agentic-ai-server"

