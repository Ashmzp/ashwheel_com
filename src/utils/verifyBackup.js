import { supabase } from '@/lib/customSupabaseClient';

const tablesToBackup = [
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

export const verifyBackup = async () => {
    const results = {
        success: true,
        timestamp: new Date().toISOString(),
        tables: {},
        errors: [],
        summary: {
            totalTables: tablesToBackup.length,
            successfulTables: 0,
            failedTables: 0,
            totalRecords: 0,
        }
    };

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            results.success = false;
            results.errors.push('User not authenticated');
            return results;
        }

        for (const table of tablesToBackup) {
            try {
                const { data, error, count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: false })
                    .eq('user_id', user.id);

                if (error) {
                    results.tables[table] = {
                        status: 'failed',
                        error: error.message,
                        recordCount: 0
                    };
                    results.summary.failedTables++;
                    results.errors.push(`${table}: ${error.message}`);
                } else {
                    const recordCount = data?.length || 0;
                    results.tables[table] = {
                        status: 'success',
                        recordCount,
                        canBackup: true
                    };
                    results.summary.successfulTables++;
                    results.summary.totalRecords += recordCount;
                }
            } catch (err) {
                results.tables[table] = {
                    status: 'error',
                    error: err.message,
                    recordCount: 0
                };
                results.summary.failedTables++;
                results.errors.push(`${table}: ${err.message}`);
            }
        }

        results.success = results.summary.failedTables === 0;
    } catch (error) {
        results.success = false;
        results.errors.push(`General error: ${error.message}`);
    }

    return results;
};

export const verifyStorageBucket = async () => {
    const result = {
        success: false,
        bucketName: 'ashwheel-files',
        canUpload: false,
        canRead: false,
        error: null
    };

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            result.error = 'User not authenticated';
            return result;
        }

        // Check if bucket exists by listing user's files
        const { data, error } = await supabase.storage
            .from('ashwheel-files')
            .list(user.id, { limit: 1 });

        if (error) {
            result.error = error.message;
            return result;
        }

        result.canRead = true;

        // Try to upload a test file in user's folder
        const testFile = new Blob(['test'], { type: 'text/plain' });
        const testPath = `${user.id}/test/verify_${Date.now()}.txt`;
        
        const { error: uploadError } = await supabase.storage
            .from('ashwheel-files')
            .upload(testPath, testFile);

        if (uploadError) {
            result.error = `Upload failed: ${uploadError.message}`;
            return result;
        }

        result.canUpload = true;

        // Clean up test file
        await supabase.storage
            .from('ashwheel-files')
            .remove([testPath]);

        result.success = true;
    } catch (err) {
        result.error = err.message;
    }

    return result;
};

export const printBackupReport = (results) => {
    console.log('\n========== BACKUP VERIFICATION REPORT ==========');
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`Overall Status: ${results.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log('\n--- Summary ---');
    console.log(`Total Tables: ${results.summary.totalTables}`);
    console.log(`Successful: ${results.summary.successfulTables}`);
    console.log(`Failed: ${results.summary.failedTables}`);
    console.log(`Total Records: ${results.summary.totalRecords}`);
    
    console.log('\n--- Table Details ---');
    Object.entries(results.tables).forEach(([table, info]) => {
        const icon = info.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${table}: ${info.recordCount} records ${info.error ? `(Error: ${info.error})` : ''}`);
    });

    if (results.errors.length > 0) {
        console.log('\n--- Errors ---');
        results.errors.forEach(err => console.log(`❌ ${err}`));
    }
    
    console.log('\n===============================================\n');
};

export const printStorageReport = (result) => {
    console.log('\n========== STORAGE VERIFICATION REPORT ==========');
    console.log(`Bucket: ${result.bucketName}`);
    console.log(`Overall Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Can Read: ${result.canRead ? '✅' : '❌'}`);
    console.log(`Can Upload: ${result.canUpload ? '✅' : '❌'}`);
    if (result.error) {
        console.log(`Error: ${result.error}`);
    }
    console.log('================================================\n');
};
