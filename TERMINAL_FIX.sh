#!/bin/bash
# Terminal Diagnostic & Fix Script for ashwheel.com

echo "========================================="
echo "ASHWHEEL.COM - DIAGNOSTIC & FIX"
echo "========================================="
echo ""

# 1. Check DNS
echo "1. Checking DNS..."
nslookup ashwheel.com
nslookup www.ashwheel.com
echo ""

# 2. Check if container is running
echo "2. Checking Docker containers..."
docker ps | grep ashwheel
echo ""

# 3. Check container logs
echo "3. Checking container logs (last 20 lines)..."
CONTAINER_ID=$(docker ps | grep ashwheel | awk '{print $1}')
if [ ! -z "$CONTAINER_ID" ]; then
    docker logs --tail 20 $CONTAINER_ID
else
    echo "No ashwheel container found!"
fi
echo ""

# 4. Test container internally
echo "4. Testing container on port 80..."
curl -I http://localhost:80 2>&1 | head -5
echo ""

# 5. Check Caddy proxy
echo "5. Checking Caddy proxy..."
docker ps | grep caddy
echo ""

# 6. Check Caddy logs
echo "6. Checking Caddy logs..."
docker logs $(docker ps | grep caddy | awk '{print $1}') --tail 30 2>&1 | grep ashwheel
echo ""

# 7. Restart Caddy proxy
echo "7. Restarting Caddy proxy..."
docker restart $(docker ps | grep caddy | awk '{print $1}')
echo "Caddy restarted!"
echo ""

# 8. Check SSL certificates
echo "8. Checking SSL certificates..."
docker exec $(docker ps | grep caddy | awk '{print $1}') ls -la /data/caddy/certificates/ 2>&1 | grep ashwheel
echo ""

echo "========================================="
echo "DIAGNOSTIC COMPLETE"
echo "========================================="
echo ""
echo "NEXT STEPS:"
echo "1. Add DNS A record: www -> 31.97.235.213"
echo "2. Wait 2-3 minutes for SSL"
echo "3. Test: http://ashwheel.com (without https)"
echo ""
