#!/bin/bash
# Complete System Check - ashwheel.com

echo "========================================="
echo "COMPLETE SYSTEM CHECK"
echo "========================================="
echo ""

# 1. DNS Check
echo "1. DNS RECORDS CHECK"
echo "-------------------"
nslookup ashwheel.com | grep -A 1 "Name:"
nslookup www.ashwheel.com | grep -A 1 "Name:"
nslookup coolify.ashwheel.com | grep -A 1 "Name:"
nslookup supabase.ashwheel.com | grep -A 1 "Name:"
echo ""

# 2. Website Check
echo "2. WEBSITE STATUS CHECK"
echo "----------------------"
echo "ashwheel.com:"
curl -I https://ashwheel.com 2>&1 | head -1
echo ""
echo "www.ashwheel.com:"
curl -I https://www.ashwheel.com 2>&1 | head -1
echo ""

# 3. Supabase Check
echo "3. SUPABASE STATUS CHECK"
echo "-----------------------"
echo "supabase.ashwheel.com:"
curl -I https://supabase.ashwheel.com 2>&1 | head -1
echo ""
echo "supabase.ashwheel.cloud:"
curl -I https://supabase.ashwheel.cloud 2>&1 | head -1
echo ""

# 4. Coolify Check
echo "4. COOLIFY STATUS CHECK"
echo "----------------------"
echo "coolify.ashwheel.cloud:"
curl -I https://coolify.ashwheel.cloud 2>&1 | head -1
echo ""

# 5. Docker Containers
echo "5. DOCKER CONTAINERS STATUS"
echo "--------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "ashwheel|supabase|coolify" | head -10
echo ""

# 6. SSL Certificates
echo "6. SSL CERTIFICATES CHECK"
echo "------------------------"
echo "ashwheel.com SSL:"
echo | openssl s_client -servername ashwheel.com -connect ashwheel.com:443 2>/dev/null | grep -A 2 "subject="
echo ""
echo "supabase.ashwheel.com SSL:"
echo | openssl s_client -servername supabase.ashwheel.com -connect supabase.ashwheel.com:443 2>/dev/null | grep -A 2 "subject="
echo ""

# 7. Backup Check
echo "7. BACKUP STATUS CHECK"
echo "---------------------"
echo "Supabase DB backups:"
docker exec $(docker ps | grep supabase-db | awk '{print $1}') ls -lh /var/lib/postgresql/data/backups/ 2>/dev/null | tail -5
echo ""

# 8. Disk Space
echo "8. DISK SPACE CHECK"
echo "------------------"
df -h / | tail -1
echo ""

# 9. Memory Usage
echo "9. MEMORY USAGE CHECK"
echo "--------------------"
free -h | grep -E "Mem|Swap"
echo ""

# 10. Recent Logs
echo "10. RECENT ERRORS CHECK"
echo "----------------------"
echo "Caddy proxy errors (last 5):"
docker logs coolify-proxy 2>&1 | grep -i error | tail -5
echo ""

echo "========================================="
echo "CHECK COMPLETE"
echo "========================================="
