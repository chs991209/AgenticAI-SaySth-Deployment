#!/bin/bash
# 기존 컨테이너 문제 해결 스크립트
# ContainerConfig 오류가 발생했을 때 사용

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== 기존 컨테이너 정리 중 ===${NC}"

# 모든 관련 컨테이너 중지 및 제거
echo "1. 기존 컨테이너 중지 및 제거..."
docker-compose -f docker-compose.hub.yml down 2>/dev/null || true
docker-compose -f docker-compose.yml down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# 이름으로 직접 제거 (혹시 모를 경우)
echo "2. 개별 컨테이너 제거..."
docker rm -f agentic-ai-server agentic-ai-server-dev frontend-server frontend-server-dev 2>/dev/null || true

# 네트워크 정리 (선택사항)
echo "3. 네트워크 정리..."
docker network prune -f

echo -e "${GREEN}✓ 정리 완료${NC}"
echo ""
echo -e "${YELLOW}이제 ./update-images.sh your_username 을 실행하세요.${NC}"

