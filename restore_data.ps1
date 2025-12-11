# PowerShell script to restore Supabase backup
$backupFile = "C:\Users\ASHISH\Desktop\ashwheel_com\dump\backup_20251208_170508.sql"
$dbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Check if Docker is available and use it to run psql
try {
    Write-Host "Restoring backup using Docker PostgreSQL client..."
    Get-Content $backupFile | docker run --rm -i --network host postgres:15 psql $dbUrl
    Write-Host "Backup restored successfully!"
} catch {
    Write-Host "Docker method failed. Error: $($_.Exception.Message)"
    Write-Host "Trying alternative approach with Supabase CLI..."
    
    # Alternative: Use Supabase CLI with direct SQL execution
    try {
        supabase db exec --file $backupFile
        Write-Host "Backup restored using Supabase CLI!"
    } catch {
        Write-Host "Supabase CLI method also failed. Error: $($_.Exception.Message)"
        Write-Host "Please check if Supabase is running and try manual restore."
    }
}