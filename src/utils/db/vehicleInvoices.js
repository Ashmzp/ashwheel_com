import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { addStock } from './stock';
import { sanitizeSearchTerm, validatePageSize } from '@/utils/security/inputValidator';
import { validateSession } from '@/utils/security/authValidator';
import { safeErrorMessage, logError } from '@/utils/security/errorHandler';

const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    return user.id;
};

export const getVehicleInvoices = async ({ page = 1, pageSize = 50, searchTerm = '', startDate, endDate }) => {
    try {
        await validateSession();
        const userId = await getCurrentUserId();
        const validPageSize = validatePageSize(pageSize);
        const sanitizedSearch = sanitizeSearchTerm(searchTerm);
        
        let invoiceIds = null;
        if (sanitizedSearch) {
            const { data: itemsData } = await supabase
                .from('vehicle_invoice_items')
                .select('invoice_id')
                .eq('user_id', userId)
                .or(`chassis_no.ilike.%${sanitizedSearch}%,engine_no.ilike.%${sanitizedSearch}%,model_name.ilike.%${sanitizedSearch}%`);
            
            if (itemsData && itemsData.length > 0) {
                invoiceIds = [...new Set(itemsData.map(item => item.invoice_id))];
            }
        }
        
        let query = supabase
            .from('vehicle_invoices')
            .select('*, vehicle_invoice_items(*), customers(*)', { count: 'exact' })
            .eq('user_id', userId)
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate)
            .order('invoice_date', { ascending: false });
        
        if (sanitizedSearch) {
            if (invoiceIds && invoiceIds.length > 0) {
                query = query.or(`invoice_no.ilike.%${sanitizedSearch}%,customer_name.ilike.%${sanitizedSearch}%,id.in.(${invoiceIds.join(',')})`);
            } else {
                query = query.or(`invoice_no.ilike.%${sanitizedSearch}%,customer_name.ilike.%${sanitizedSearch}%`);
            }
        }
        
        query = query.range((page - 1) * validPageSize, page * validPageSize - 1);
        
        const { data, error, count } = await query;

        if (error) {
            logError(error, 'getVehicleInvoices');
            throw new Error(safeErrorMessage(error));
        }

        const invoices = (data || []).map(inv => ({
            invoice_id: inv.id,
            invoice_no: inv.invoice_no,
            invoice_date: inv.invoice_date,
            customer_name: inv.customer_name,
            grand_total: inv.total_amount,
            customer: inv.customers,
            items: inv.vehicle_invoice_items || [],
            customer_details_json: inv.customer_details,
            extra_charges_json: inv.extra_charges,
            gst_number: inv.customer_details?.gst || inv.customers?.gst || '',
        }));

        return { data: invoices, count: count || 0, error: null };
    } catch (error) {
        logError(error, 'getVehicleInvoices');
        throw new Error(safeErrorMessage(error));
    }
};

export const getVehicleInvoiceItems = async (invoiceId) => {
    try {
        const { data, error } = await supabase
            .from('vehicle_invoice_items')
            .select('*')
            .eq('invoice_id', invoiceId);
        if (error) throw new Error(`Failed to fetch invoice items: ${error.message}`);
        return data;
    } catch (error) {
        throw new Error(error.message || 'Failed to fetch vehicle invoice items');
    }
};

export const saveVehicleInvoice = async (invoiceData) => {
    try {
        await validateSession();
        const userId = await getCurrentUserId();
        const isUpdating = !!invoiceData.id;

        // For updates, use old method
        if (isUpdating) {
            return await saveVehicleInvoiceOld(invoiceData, userId);
        }

        // For new invoices, check if chassis is available in stock
        // Stock table is the source of truth - if chassis is in stock, it can be invoiced
        const chassisNumbers = (invoiceData.items || []).map(item => item.chassis_no).filter(Boolean);
        if (chassisNumbers.length > 0) {
            const { data: stockItems } = await supabase
                .from('stock')
                .select('chassis_no')
                .in('chassis_no', chassisNumbers)
                .eq('user_id', userId);
            
            const availableChassis = new Set((stockItems || []).map(s => s.chassis_no));
            const unavailableChassis = chassisNumbers.filter(c => !availableChassis.has(c));
            
            if (unavailableChassis.length > 0) {
                throw new Error(`Chassis not available in stock: ${unavailableChassis.join(', ')}`);
            }
        }

        // Generate invoice number
        const isRegistered = invoiceData.selectedCustomer?.gst && invoiceData.selectedCustomer.gst.trim() !== '';
        const invoiceType = isRegistered ? 'registered' : 'non_registered';
        const { data: finalInvoiceNo, error: genError } = await supabase.rpc('generate_and_increment_invoice_no', {
            p_user_id: userId,
            p_invoice_type: invoiceType,
            p_invoice_date: invoiceData.invoice_date
        });
        if (genError) throw new Error(`Failed to generate invoice number: ${genError.message}`);

        const invoicePayload = {
            id: uuidv4(),
            user_id: userId,
            invoice_no: finalInvoiceNo,
            invoice_date: invoiceData.invoice_date,
            customer_id: invoiceData.selectedCustomer?.id,
            customer_name: invoiceData.selectedCustomer?.customer_name,
            status: 'active',
            customer_details: {
                ...invoiceData.customer_details,
                gst: invoiceData.selectedCustomer?.gst,
                address: invoiceData.selectedCustomer?.address,
                mobile1: invoiceData.selectedCustomer?.mobile1,
                state: invoiceData.selectedCustomer?.state,
                district: invoiceData.selectedCustomer?.district,
                pincode: invoiceData.selectedCustomer?.pincode,
            },
            extra_charges: invoiceData.extra_charges,
            total_amount: invoiceData.total_amount,
        };

        const itemsToInsert = (invoiceData.items || []).map(item => ({
            id: uuidv4(),
            invoice_id: invoicePayload.id,
            user_id: userId,
            model_name: item.model_name,
            chassis_no: item.chassis_no,
            engine_no: item.engine_no,
            price: item.price,
            colour: item.colour,
            gst: item.gst,
            hsn: item.hsn,
            taxable_value: item.taxable_value,
            cgst_rate: item.cgst_rate,
            sgst_rate: item.sgst_rate,
            igst_rate: item.igst_rate,
            cgst_amount: item.cgst_amount,
            sgst_amount: item.sgst_amount,
            igst_amount: item.igst_amount,
            discount: item.discount,
        }));

        // Insert invoice
        const { data: savedInvoice, error: invoiceError } = await supabase
            .from('vehicle_invoices')
            .insert(invoicePayload)
            .select()
            .single();

        if (invoiceError) {
            if (invoiceError.code === '23505') {
                throw new Error('Chassis already invoiced by another user. Please refresh and try again.');
            }
            throw new Error(`Failed to save invoice: ${invoiceError.message}`);
        }

        // Insert items (trigger will handle stock deletion)
        if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
                .from('vehicle_invoice_items')
                .insert(itemsToInsert);
            
            if (itemsError) {
                // Rollback invoice if items fail
                await supabase.from('vehicle_invoices').delete().eq('id', savedInvoice.id);
                throw new Error(`Failed to save invoice items: ${itemsError.message}`);
            }
        }

        return savedInvoice;
    } catch (error) {
        throw new Error(error.message || 'Failed to save vehicle invoice');
    }
};

// Old method for updates
const saveVehicleInvoiceOld = async (invoiceData, userId) => {
    const finalInvoiceNo = invoiceData.invoice_no;
    const invoicePayload = {
        id: invoiceData.id,
        user_id: userId,
        invoice_no: finalInvoiceNo,
        invoice_date: invoiceData.invoice_date,
        customer_id: invoiceData.selectedCustomer?.id,
        customer_name: invoiceData.selectedCustomer?.customer_name,
        customer_details: {
            ...invoiceData.customer_details,
            gst: invoiceData.selectedCustomer?.gst,
            address: invoiceData.selectedCustomer?.address,
            mobile1: invoiceData.selectedCustomer?.mobile1,
            state: invoiceData.selectedCustomer?.state,
            district: invoiceData.selectedCustomer?.district,
            pincode: invoiceData.selectedCustomer?.pincode,
        },
        extra_charges: invoiceData.extra_charges,
        total_amount: invoiceData.total_amount,
    };

    const { data: savedInvoice, error: invoiceError } = await supabase
        .from('vehicle_invoices')
        .update(invoicePayload)
        .eq('id', invoiceData.id)
        .select()
        .single();

    if (invoiceError) throw new Error(`Failed to update invoice: ${invoiceError.message}`);

    const itemsToUpsert = (invoiceData.items || []).map(item => ({
        id: item.id || uuidv4(),
        invoice_id: savedInvoice.id,
        user_id: userId,
        model_name: item.model_name,
        chassis_no: item.chassis_no,
        engine_no: item.engine_no,
        price: item.price,
        colour: item.colour,
        gst: item.gst,
        hsn: item.hsn,
        taxable_value: item.taxable_value,
        cgst_rate: item.cgst_rate,
        sgst_rate: item.sgst_rate,
        igst_rate: item.igst_rate,
        cgst_amount: item.cgst_amount,
        sgst_amount: item.sgst_amount,
        igst_amount: item.igst_amount,
        discount: item.discount,
    }));
    
    const { data: oldItems } = await supabase
        .from('vehicle_invoice_items')
        .select('*')
        .eq('invoice_id', savedInvoice.id);
    
    const newChassisNos = itemsToUpsert.map(i => i.chassis_no);
    const itemsToDelete = (oldItems || []).filter(oi => !newChassisNos.includes(oi.chassis_no));

    if (itemsToDelete.length > 0) {
        await supabase
            .from('vehicle_invoice_items')
            .delete()
            .eq('invoice_id', savedInvoice.id)
            .in('chassis_no', itemsToDelete.map(i => i.chassis_no));
    }
    
    if (itemsToUpsert.length > 0) {
        await supabase
            .from('vehicle_invoice_items')
            .upsert(itemsToUpsert);
    }

    return savedInvoice;
};

export const deleteVehicleInvoice = async (invoiceId) => {
    try {
        await validateSession();
        const { error } = await supabase.from('vehicle_invoices').delete().eq('id', invoiceId);
        if (error) {
          // Ignore stock duplicate errors (expected when restore_on_delete is enabled)
          if (error.code === '23505' && error.message?.includes('stock_user_id_chassis_no_key')) {
            return { error: null };
          }
          logError(error, 'deleteVehicleInvoice');
          throw new Error(safeErrorMessage(error));
        }
        return { error: null };
    } catch (error) {
        logError(error, 'deleteVehicleInvoice');
        throw new Error(safeErrorMessage(error));
    }
};

export const getVehicleInvoicesForExport = async ({ startDate, endDate, searchTerm }) => {
    try {
        await validateSession();
        const userId = await getCurrentUserId();
        const sanitizedSearch = sanitizeSearchTerm(searchTerm);
        
        let invoiceIds = null;
        if (sanitizedSearch) {
            const { data: itemsData } = await supabase
                .from('vehicle_invoice_items')
                .select('invoice_id')
                .eq('user_id', userId)
                .or(`chassis_no.ilike.%${sanitizedSearch}%,engine_no.ilike.%${sanitizedSearch}%,model_name.ilike.%${sanitizedSearch}%`);
            
            if (itemsData && itemsData.length > 0) {
                invoiceIds = [...new Set(itemsData.map(item => item.invoice_id))];
            }
        }
        
        let query = supabase
            .from('vehicle_invoices')
            .select('*, vehicle_invoice_items(*), customers(*)')
            .eq('user_id', userId)
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate)
            .order('invoice_date', { ascending: false });
        
        if (sanitizedSearch) {
            if (invoiceIds && invoiceIds.length > 0) {
                query = query.or(`invoice_no.ilike.%${sanitizedSearch}%,customer_name.ilike.%${sanitizedSearch}%,id.in.(${invoiceIds.join(',')})`);
            } else {
                query = query.or(`invoice_no.ilike.%${sanitizedSearch}%,customer_name.ilike.%${sanitizedSearch}%`);
            }
        }
        
        const { data, error } = await query;
        
        if (error) {
          logError(error, 'getVehicleInvoicesForExport');
          throw new Error(safeErrorMessage(error));
        }
        
        return (data || []).map(inv => ({
            invoice_id: inv.id,
            invoice_no: inv.invoice_no,
            invoice_date: inv.invoice_date,
            customer_name: inv.customer_name,
            grand_total: inv.total_amount,
            customer: inv.customers,
            items: inv.vehicle_invoice_items || [],
            customer_details_json: inv.customer_details,
            extra_charges_json: inv.extra_charges,
            gst_number: inv.customer_details?.gst || inv.customers?.gst || '',
        }));
    } catch (error) {
        logError(error, 'getVehicleInvoicesForExport');
        throw new Error(safeErrorMessage(error));
    }
};