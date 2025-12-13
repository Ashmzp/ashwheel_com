import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { sanitizeSearchTerm, validatePageSize } from '@/utils/security/inputValidator';
import { validateSession } from '@/utils/security/authValidator';
import { safeErrorMessage, logError } from '@/utils/security/errorHandler';

const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    return user.id;
};

export const saveReceipt = async (receiptData) => {
    try {
      await validateSession();
      const userId = await getCurrentUserId();
    const payload = {
        ...receiptData,
        user_id: userId,
        id: receiptData.id || uuidv4(),
    };
    
    // Remove customer_name as it's not in the receipts table
    delete payload.customer_name;

      const { data, error } = await supabase.from('receipts').upsert(payload).select().single();
      if (error) {
        logError(error, 'saveReceipt');
        throw new Error(safeErrorMessage(error));
      }
      return data;
    } catch (error) {
      logError(error, 'saveReceipt');
      throw new Error(safeErrorMessage(error));
    }
};

export const getReceipts = async ({ page = 1, pageSize = 10, searchTerm = '', startDate, endDate }) => {
    try {
      await validateSession();
      const userId = await getCurrentUserId();
      const validPageSize = validatePageSize(pageSize);
      const from = (page - 1) * validPageSize;
      const to = from + validPageSize - 1;
      const sanitizedSearch = sanitizeSearchTerm(searchTerm);

      let query = supabase
          .from('receipts')
          .select('*, customers(customer_name)', { count: 'exact' })
          .eq('user_id', userId)
          .order('receipt_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to);

      if (startDate) {
          query = query.gte('receipt_date', format(new Date(startDate), 'yyyy-MM-dd'));
      }
      if (endDate) {
          query = query.lte('receipt_date', format(new Date(endDate), 'yyyy-MM-dd'));
      }

      if (sanitizedSearch) {
          query = query.or(`narration.ilike.%${sanitizedSearch}%,customers.customer_name.ilike.%${sanitizedSearch}%`);
      }

      const { data, error, count } = await query;
      if (error) {
        logError(error, 'getReceipts');
        throw new Error(safeErrorMessage(error));
      }
      return { data, count };
    } catch (error) {
      logError(error, 'getReceipts');
      throw new Error(safeErrorMessage(error));
    }
};

export const deleteReceipt = async (id) => {
    try {
      await validateSession();
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) {
        logError(error, 'deleteReceipt');
        throw new Error(safeErrorMessage(error));
      }
      return { error: null };
    } catch (error) {
      logError(error, 'deleteReceipt');
      throw new Error(safeErrorMessage(error));
    }
};