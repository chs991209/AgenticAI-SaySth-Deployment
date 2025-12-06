#!/bin/bash
# 컨테이너 상태 확인 스크립트

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== 컨테이너 상태 확인 ===${NC}"
echo ""

# docker-compose 상태 확인
echo -e "${YELLOW}[1] docker-compose 상태:${NC}"
docker-compose -f docker-compose.hub.yml ps 2>/dev/null || echo "docker-compose 명령 실패"

echo ""
echo -e "${YELLOW}[2] Docker 컨테이너 직접 확인:${NC}"
docker ps --filter "name=agentic-ai-server" --filter "name=frontend-server" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${YELLOW}[3] 컨테이너 로그 (최근 10줄):${NC}"
echo ""
echo "--- Frontend Server ---"
docker logs --tail 10 frontend-server 2>/dev/null || echo "frontend-server 컨테이너를 찾을 수 없습니다"

echo ""
echo "--- Agentic AI Server ---"
docker logs --tail 10 agentic-ai-server 2>/dev/null || echo "agentic-ai-server 컨테이너를 찾을 수 없습니다"

echo ""
echo -e "${YELLOW}[4] 네트워크 연결 확인:${NC}"
docker network ls | grep app-network || echo "app-network를 찾을 수 없습니다"

echo ""
echo -e "${GREEN}=== 확인 완료 ===${NC}"

