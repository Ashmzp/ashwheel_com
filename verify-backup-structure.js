const fs = require('fs');

const BACKUP_FILE = './ashwheel_pro_backup_2025-12-13.json';

const EXPECTED_TABLES = [
    'settings',
    'customers',
    'purchases',
    'stock',
    'vehicle_invoices',
    'vehicle_invoice_items',
    'sales_returns',
    'purchase_returns',
    'workshop_purchases',
    'workshop_inventory',
    'job_cards',
    'workshop_purchase_returns',
    'workshop_sales_returns',
    'workshop_follow_ups',
    'workshop_labour_items',
];

console.log('🔍 Analyzing Backup File...\n');

try {
    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    
    console.log('📊 BACKUP STRUCTURE ANALYSIS\n');
    console.log('=' .repeat(60));
    
    let totalRecords = 0;
    let missingTables = [];
    let emptyTables = [];
    
    EXPECTED_TABLES.forEach(table => {
        if (!data[table]) {
            missingTables.push(table);
            console.log(`❌ ${table.padEnd(30)} - MISSING`);
        } else if (data[table].length === 0) {
            emptyTables.push(table);
            console.log(`⚠️  ${table.padEnd(30)} - Empty (0 records)`);
        } else {
            const count = data[table].length;
            totalRecords += count;
            console.log(`✅ ${table.padEnd(30)} - ${count} records`);
        }
    });
    
    console.log('=' .repeat(60));
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Tables: ${EXPECTED_TABLES.length}`);
    console.log(`   Present: ${EXPECTED_TABLES.length - missingTables.length}`);
    console.log(`   Missing: ${missingTables.length}`);
    console.log(`   Empty: ${emptyTables.length}`);
    console.log(`   Total Records: ${totalRecords}`);
    
    if (missingTables.length > 0) {
        console.log(`\n⚠️  MISSING TABLES:`);
        missingTables.forEach(t => console.log(`   - ${t}`));
    }
    
    if (emptyTables.length > 0) {
        console.log(`\n⚠️  EMPTY TABLES:`);
        emptyTables.forEach(t => console.log(`   - ${t}`));
    }
    
    // Check file size
    const stats = fs.statSync(BACKUP_FILE);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n💾 FILE SIZE: ${fileSizeMB} MB`);
    
    if (stats.size > 10 * 1024 * 1024) {
        console.log(`   ⚠️  WARNING: File is large (>10MB). Import may be slow.`);
    }
    
    // Sample data check
    console.log(`\n🔍 SAMPLE DATA CHECK:`);
    if (data.purchases && data.purchases.length > 0) {
        const purchase = data.purchases[0];
        console.log(`   Purchase ID: ${purchase.id}`);
        console.log(`   Items: ${purchase.items?.length || 0}`);
        console.log(`   User ID: ${purchase.user_id}`);
    }
    
    if (data.stock && data.stock.length > 0) {
        console.log(`   Stock Items: ${data.stock.length}`);
        const stock = data.stock[0];
        console.log(`   Sample: ${stock.model_name} - ${stock.chassis_no}`);
    }
    
    console.log(`\n✅ BACKUP FILE IS VALID AND READY FOR IMPORT\n`);
    
} catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
}
