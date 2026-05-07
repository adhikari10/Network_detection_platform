#!/bin/bash
BACKEND_DIR="/home/shared/guardian-brain"
FRONTEND_DIR="/home/shared/guardian-brain/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Starting Guardian (Dell)...${NC}"

pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "vite preview" 2>/dev/null
sleep 1

echo -e "${YELLOW}[1/2] Starting backend...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/guardian-backend.log 2>&1 &
sleep 3

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Backend live on port 8000${NC}"
else
    echo -e "  ${RED}✗ Backend failed — check: tail -f /tmp/guardian-backend.log${NC}"
    exit 1
fi

echo -e "${YELLOW}[2/2] Starting frontend...${NC}"
cd "$FRONTEND_DIR"
nohup npm run preview -- --host 0.0.0.0 --port 4173 > /tmp/guardian-frontend.log 2>&1 &
sleep 2
echo -e "  ${GREEN}✓ Frontend live on port 4173${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Dashboard: ${CYAN}http://100.90.12.111:4173${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Now start Pi 5: sudo python3 /home/bibek/guardian/orchestrator.py 2>&1 | grep -v 'wrong thread'"
