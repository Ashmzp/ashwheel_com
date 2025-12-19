import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeSearchTerm, validatePageSize } from '@/utils/security/inputValidator';
import { validateSession } from '@/utils/security/authValidator';
import { safeErrorMessage, logError } from '@/utils/security/errorHandler';

const getCurrentUserId = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Auth error:', error);
        throw new Error("Authentication failed: " + error.message);
    }
    if (!user) {
        console.error('No user found');
        throw new Error("User not authenticated.");
    }
    return user.id;
};

export const getPurchases = async ({ page = 1, pageSize = 10, searchTerm = '', startDate, endDate } = {}) => {
    try {
      await validateSession();
      const userId = await getCurrentUserId();
      const validPageSize = validatePageSize(pageSize);
      const from = (page - 1) * validPageSize;
      const to = from + validPageSize - 1;
      const sanitizedSearch = sanitizeSearchTerm(searchTerm);

      let query = supabase
          .from('purchases')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('invoice_date', { ascending: false })
          .order('created_at', { ascending: false });
      
      if (validPageSize !== 500) {
          query = query.range(from, to);
      }
        
      // Always apply date range unless searching
      if (!searchTerm) {
          if (startDate) {
              query = query.gte('invoice_date', startDate);
          }
          if (endDate) {
              query = query.lte('invoice_date', endDate);
          }
      }

      const { data, error, count } = await query;

      if (error) {
        logError(error, 'getPurchases');
        throw new Error(safeErrorMessage(error));
      }
      
      if (sanitizedSearch && data) {
          const filteredData = data.filter(purchase => {
              if (purchase.party_name?.toLowerCase().includes(sanitizedSearch) || purchase.invoice_no?.toLowerCase().includes(sanitizedSearch)) {
                  return true;
              }
              return (purchase.items || []).some(item => 
                  (item.chassisNo && item.chassisNo.toLowerCase().includes(sanitizedSearch)) ||
                  (item.engineNo && item.engineNo.toLowerCase().includes(sanitizedSearch))
              );
          });
          return { data: filteredData, count: filteredData.length };
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      logError(error, 'getPurchases');
      throw new Error(safeErrorMessage(error));
    }
};

export const getPurchaseById = async (id) => {
    const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching purchase by ID:', error);
        throw error;
    }
    return data;
};

export const savePurchase = async (purchaseData) => {
    try {
      await validateSession();
      const userId = await getCurrentUserId();
      const isUpdating = !!purchaseData.id;

      // Get next serial number if creating new purchase
      let serialNo = purchaseData.serial_no;
      if (!isUpdating && !serialNo) {
        const { data: lastPurchase } = await supabase
          .from('purchases')
          .select('serial_no')
          .eq('user_id', userId)
          .order('serial_no', { ascending: false })
          .limit(1);
        
        serialNo = lastPurchase && lastPurchase.length > 0 ? (lastPurchase[0].serial_no + 1) : 1;
      }

      const payload = {
          id: isUpdating ? purchaseData.id : uuidv4(),
          user_id: userId,
          serial_no: serialNo,
          invoice_date: purchaseData.invoiceDate,
          invoice_no: purchaseData.invoiceNo,
          party_name: purchaseData.partyName,
          items: purchaseData.items || [],
          created_at: isUpdating ? purchaseData.created_at : new Date().toISOString(),
          category: purchaseData.items?.[0]?.category || null,
      };

      console.log('Saving purchase with payload:', payload);

      const { data, error } = await supabase
          .from('purchases')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

      if (error) {
          console.error('Supabase error:', error);
          logError(error, 'savePurchase');
          throw new Error(safeErrorMessage(error));
      }

      console.log('Purchase saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Save purchase error:', error);
      logError(error, 'savePurchase');
      throw new Error(safeErrorMessage(error));
    }
};

export const deletePurchase = async (id) => {
    try {
      await validateSession();
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) {
        logError(error, 'deletePurchase');
        throw new Error(safeErrorMessage(error));
      }
      return { success: true };
    } catch (error) {
      logError(error, 'deletePurchase');
      throw new Error(safeErrorMessage(error));
    }
};