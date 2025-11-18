#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting FiveThirty Development Environment${NC}"

# Function to check if Supabase is running
check_supabase() {
  supabase status &>/dev/null
  return $?
}

# Function to start Supabase
start_supabase() {
  echo -e "${YELLOW}📦 Starting Supabase...${NC}"
  supabase start

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Supabase started successfully${NC}"
    return 0
  else
    echo -e "${RED}✗ Failed to start Supabase${NC}"
    return 1
  fi
}

# Function to stop Supabase on exit
cleanup() {
  echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
  # Don't stop Supabase automatically - let it keep running
  # User can manually stop with: supabase stop
  exit 0
}

# Set up cleanup trap
trap cleanup SIGINT SIGTERM

# Check if Supabase is already running
if check_supabase; then
  echo -e "${GREEN}✓ Supabase is already running${NC}"
else
  # Start Supabase if not running
  if ! start_supabase; then
    echo -e "${RED}Failed to start development environment${NC}"
    exit 1
  fi
fi

# Display Supabase info
echo -e "\n${GREEN}📊 Supabase Status:${NC}"
supabase status | grep -E "(API URL|Studio URL|anon key)"

echo -e "\n${GREEN}🌐 Starting Next.js...${NC}"

# Start Next.js with Turbopack
next dev --turbopack
