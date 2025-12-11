#!/bin/bash

# Find Supabase Storage Path
# Run this on server: bash FIND_STORAGE_PATH.sh

echo "🔍 Finding Supabase Storage Path..."
echo ""

# Method 1: Check all docker volumes
echo "📦 Docker Volumes:"
docker volume ls | grep -i storage

echo ""
echo "📁 Checking common paths:"

# Method 2: Check common paths
PATHS=(
    "/var/lib/docker/volumes/supabase_storage/_data"
    "/var/lib/docker/volumes/supabase_storage_supabase_storage/_data"
    "/var/lib/docker/volumes/supabase_db_storage/_data"
    "/root/supabase/volumes/storage"
    "/opt/supabase/storage"
)

for path in "${PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "✅ Found: $path"
        echo "   Files: $(ls -A "$path" 2>/dev/null | wc -l)"
    fi
done

echo ""
echo "🐳 Docker Compose Volumes:"
docker compose ps 2>/dev/null | grep -i storage || echo "No compose found"

echo ""
echo "📂 All Docker Volumes with Mountpoints:"
docker volume ls -q | while read vol; do
    mountpoint=$(docker volume inspect "$vol" 2>/dev/null | grep -i mountpoint | cut -d'"' -f4)
    if [[ "$vol" == *"storage"* ]] || [[ "$mountpoint" == *"storage"* ]]; then
        echo "Volume: $vol"
        echo "  Path: $mountpoint"
        [ -d "$mountpoint" ] && echo "  Files: $(ls -A "$mountpoint" 2>/dev/null | wc -l)"
        echo ""
    fi
done

echo "✅ Done! Use the path that has files in it."
