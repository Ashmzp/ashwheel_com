import { supabase } from '@/lib/customSupabaseClient';
import { sanitizeSearchTerm, validatePageSize } from '@/utils/security/inputValidator';
import { validateSession } from '@/utils/security/authValidator';
import { safeErrorMessage, logError } from '@/utils/security/errorHandler';

const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    return user.id;
};

export const getSalesReturns = async ({ page = 1, pageSize = 20, searchTerm = '', dateRange = {} } = {}) => {
  try {
    await validateSession();
    const userId = await getCurrentUserId();
    const validPageSize = validatePageSize(pageSize);
    const sanitizedSearch = sanitizeSearchTerm(searchTerm);
    let query = supabase
    .from('sales_returns')
    .select(`
      *, 
      vehicle_invoices(invoice_no)
    `, { count: 'exact' })
    .eq('user_id', userId);

    if (sanitizedSearch) {
      const searchJsonQuery = `items.cs.{"chassis_no":"${sanitizedSearch}"},items.cs.{"engine_no":"${sanitizedSearch}"}`;
      query = query.or(`return_invoice_no.ilike.%${sanitizedSearch}%,customer_name.ilike.%${sanitizedSearch}%,${searchJsonQuery}`);
    }
  
  if (dateRange.start) query = query.gte('return_date', dateRange.start);
  if (dateRange.end) query = query.lte('return_date', dateRange.end);

    const from = (page - 1) * validPageSize;
    const to = page * validPageSize - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) {
      logError(error, 'getSalesReturns');
      throw new Error(safeErrorMessage(error));
    }
    
    if (sanitizedSearch) {
      const filteredData = data.filter(r => {
          const customerMatch = r.customer_name?.toLowerCase().includes(sanitizedSearch);
          const invoiceMatch = r.return_invoice_no?.toLowerCase().includes(sanitizedSearch);
          const itemMatch = (Array.isArray(r.items) ? r.items : []).some(item => 
              item.chassis_no?.toLowerCase().includes(sanitizedSearch) ||
              item.engine_no?.toLowerCase().includes(sanitizedSearch)
          );
          return customerMatch || invoiceMatch || itemMatch;
      });
      return { data: filteredData, count: filteredData.length };
    }

    return { data, count };
  } catch (error) {
    logError(error, 'getSalesReturns');
    throw new Error(safeErrorMessage(error));
  }
};

export const saveSalesReturn = async (returnData) => {
  try {
    await validateSession();
    const userId = await getCurrentUserId();
    
    // Validation: Check items exist
    if (!returnData.items || returnData.items.length === 0) {
      throw new Error('No items to return.');
    }
    
    const chassisNumbers = returnData.items.map(item => item.chassis_no).filter(Boolean);
    if (chassisNumbers.length === 0) {
      throw new Error('Invalid items: chassis numbers missing.');
    }
    
    // Step 1: Delete invoice items first (trigger restores stock)
    if (returnData.invoice_id) {
      const { error: deleteError } = await supabase
        .from('vehicle_invoice_items')
        .delete()
        .eq('invoice_id', returnData.invoice_id)
        .in('chassis_no', chassisNumbers);
      
      if (deleteError) {
        logError(deleteError, 'saveSalesReturn - delete items');
        throw new Error(`Failed to process return: ${safeErrorMessage(deleteError)}`);
      }
    }
    
    // Step 2: Save sales return record (audit trail)
    const dataToSave = { ...returnData, user_id: userId };
    const { data, error } = await supabase
      .from('sales_returns')
      .upsert(dataToSave, { onConflict: 'id' })
      .select()
      .single();
    
    if (error) {
      logError(error, 'saveSalesReturn');
      throw new Error(safeErrorMessage(error));
    }
    
    return data;
  } catch (error) {
    logError(error, 'saveSalesReturn');
    throw new Error(safeErrorMessage(error));
  }
};

export const deleteSalesReturn = async (id) => {
  try {
    await validateSession();
    const { error } = await supabase.from('sales_returns').delete().eq('id', id);
    if (error) {
      logError(error, 'deleteSalesReturn');
      throw new Error(safeErrorMessage(error));
    }
  } catch (error) {
    logError(error, 'deleteSalesReturn');
    throw new Error(safeErrorMessage(error));
  }
};

export const searchInvoicesForReturn = async (searchTerm) => {
    try {
      await validateSession();
      const userId = await getCurrentUserId();
      const sanitizedSearch = sanitizeSearchTerm(searchTerm);
      if (!sanitizedSearch) return [];

      const { data: items, error: itemsError } = await supabase
          .from('vehicle_invoice_items')
          .select(`
              chassis_no,
              engine_no,
              model_name,
              colour,
              price,
              hsn,
              gst,
              vehicle_invoices!inner (
                  id,
                  invoice_no,
                  invoice_date,
                  customer_name,
                  customer_id,
                  status
              )
          `)
          .eq('user_id', userId)
          .eq('vehicle_invoices.status', 'active')
          .or(`chassis_no.ilike.%${sanitizedSearch}%,engine_no.ilike.%${sanitizedSearch}%`);

      if (itemsError) {
        logError(itemsError, 'searchInvoicesForReturn');
        throw new Error(safeErrorMessage(itemsError));
      }

      const results = (items || [])
          .filter(item => item.vehicle_invoices)
          .map(item => ({
              invoice: item.vehicle_invoices,
              item: {
                  chassis_no: item.chassis_no,
                  engine_no: item.engine_no,
                  model_name: item.model_name,
                  colour: item.colour,
                  price: item.price,
                  hsn: item.hsn,
                  gst: item.gst
              }
          }));

      return results;
    } catch (error) {
      logError(error, 'searchInvoicesForReturn');
      throw new Error(safeErrorMessage(error));
    }
};