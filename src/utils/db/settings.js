import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { getFinancialYear } from '@/utils/financialYearUtils';
import { validateSession } from '@/utils/security/authValidator';
import { safeErrorMessage, logError } from '@/utils/security/errorHandler';

const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    return user.id;
};

export const saveSettings = async (settings) => {
  try {
    await validateSession();
    const userId = settings.user_id || await getCurrentUserId();
  const settingsData = {
      user_id: userId,
      company_name: settings.companyName,
      gst_no: settings.gstNo,
      pan: settings.pan,
      mobile: settings.mobile,
      address: settings.address,
      state: settings.state,
      district: settings.district,
      pin_code: settings.pinCode,
      bank_details: settings.bank_details,
      company_logo_url: settings.company_logo_url,
      upi_qr_code_url: settings.upi_qr_code_url,
      terms_and_conditions: settings.terms_and_conditions,
      registered_invoice_prefix: settings.registeredInvoicePrefix,
      non_registered_invoice_prefix: settings.nonRegisteredInvoicePrefix,
      workshop_settings: settings.workshop_settings,
      booking_settings: settings.booking_settings,
      "nonRegisteredCustomerFields": settings.nonRegisteredCustomerFields,
      "registeredCustomerFields": settings.registeredCustomerFields,
      custom_fields: settings.customFields,
      purchase_item_fields: settings.purchaseItemFields,
      purchase_custom_fields: settings.purchaseCustomFields,
      enable_extra_charges: settings.enable_extra_charges,
      extra_charges_mandatory_for_unregistered: settings.extra_charges_mandatory_for_unregistered,
      fy_counters: settings.fy_counters,
      updated_at: new Date().toISOString()
  };

    const { error } = await supabase.from('settings').upsert(settingsData, { onConflict: 'user_id' });
    if (error) {
      logError(error, 'saveSettings');
      throw new Error(safeErrorMessage(error));
    }
  } catch (error) {
    logError(error, 'saveSettings');
    throw new Error(safeErrorMessage(error));
  }
};

const defaultCustomerFields = {
  adharNo: { label: 'Adhar No', enabled: false, mandatory: false },
  nomineeName: { label: 'Nominee Name', enabled: false, mandatory: false },
  hypothecation: { label: 'Hypothecation', enabled: false, mandatory: false },
  rto: { label: 'RTO', enabled: false, mandatory: false },
  emailId: { label: 'Email Id', enabled: false, mandatory: false },
  salesPerson: { label: 'Sales Person', enabled: false, mandatory: false },
};

export const getSettings = async () => {
    try {
      await validateSession();
      const userId = await getCurrentUserId();
      if (!userId) {
          console.warn("getSettings called without a user.");
          return null;
      }
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    const defaults = {
      companyName: 'Showroom Pro',
      gstNo: '',
      pan: '',
      mobile: '',
      address: '',
      state: '',
      district: '',
      pinCode: '',
      bank_details: { account_holder_name: '', account_number: '', bank_name: '', ifsc_code: '' },
      company_logo_url: '',
      upi_qr_code_url: '',
      terms_and_conditions: '',
      registeredInvoicePrefix: 'RINV-',
      nonRegisteredInvoicePrefix: 'NRINV-',
      fy_counters: {},
      nonRegisteredCustomerFields: { ...defaultCustomerFields },
      registeredCustomerFields: { ...defaultCustomerFields },
      customFields: [],
      enable_extra_charges: false,
      extra_charges_mandatory_for_unregistered: false,
      booking_settings: {
        customFields: [],
      },
      workshop_settings: {
        show_vehicle_details: true,
        show_labour_items: true,
        show_job_details: true,
        enable_uom: false,
        uom_mandatory: false,
        show_service_labour_invoice_title: true,
        uom_list: [
          'Nos', 'Pcs', 'Pic', 'Doz', 'Dz', 'Pkt', 'Pck', 'Pack', 'Set', 'Pair', 'Pr', 'Roll', 'Rl', 'Box', 'Bx',
          'Kg', 'Gm', 'Grm', 'Qtl', 'MT', 'Ton', 'Tonne',
          'Ltr', 'L', 'Ml', 'KL',
          'Mtr', 'M', 'Cm', 'Mm', 'Km', 'Sqm', 'm²', 'Cft', 'Cuft', 'Cbm',
          'Bag', 'Bg', 'Tin', 'Can', 'Drm', 'Drum', 'Jar', 'Bottle', 'Btl', 'Carton', 'Ctn', 'Bundle', 'Bdl', 'Sheet', 'Sht', 'Coil', 'Packet Strip'
        ],
        workshop_purchase_columns: [
            { id: 'partNo', label: 'Part No.', type: 'default', deletable: true, editable: true },
            { id: 'partName', label: 'Part Name', type: 'default', deletable: true, editable: true },
            { id: 'hsn', label: 'HSN', type: 'default', deletable: true, editable: true },
            { id: 'purchaseRate', label: 'Purchase Rate', type: 'default', deletable: true, editable: true },
            { id: 'qty', label: 'Qty', type: 'default', deletable: true, editable: true },
            { id: 'uom', label: 'UOM', type: 'default', deletable: true, editable: true },
            { id: 'saleRate', label: 'Sale Rate', type: 'default', deletable: true, editable: true },
            { id: 'gst', label: 'GST(%)', type: 'default', deletable: true, editable: true },
            { id: 'total', label: 'Total', type: 'default', deletable: false, editable: false },
            { id: 'category', label: 'Category', type: 'default', deletable: true, editable: true },
        ]
      },
    };
    
    if (error && error.code === 'PGRST116') { // No settings found for user, create them.
        const defaultSettingsForNewUser = { user_id: userId, company_name: defaults.companyName, gst_no: defaults.gstNo, pin_code: defaults.pinCode, registered_invoice_prefix: defaults.registeredInvoicePrefix, non_registered_invoice_prefix: defaults.nonRegisteredInvoicePrefix, workshop_settings: defaults.workshop_settings, booking_settings: defaults.booking_settings, fy_counters: defaults.fy_counters, "nonRegisteredCustomerFields": defaults.nonRegisteredCustomerFields, "registeredCustomerFields": defaults.registeredCustomerFields, custom_fields: defaults.customFields, enable_extra_charges: defaults.enable_extra_charges, extra_charges_mandatory_for_unregistered: defaults.extra_charges_mandatory_for_unregistered, bank_details: defaults.bank_details, company_logo_url: defaults.company_logo_url, upi_qr_code_url: defaults.upi_qr_code_url, terms_and_conditions: defaults.terms_and_conditions };
        
        const { data: newSettings, error: insertError } = await supabase
            .from('settings')
            .insert(defaultSettingsForNewUser)
            .select()
            .single();
        if (insertError) {
            console.error("Error creating default settings:", insertError);
            return { ...defaults, user_id: userId };
        }
        return {
            ...newSettings,
            companyName: newSettings.company_name,
            gstNo: newSettings.gst_no,
            pinCode: newSettings.pin_code,
            registeredInvoicePrefix: newSettings.registered_invoice_prefix,
            nonRegisteredInvoicePrefix: newSettings.non_registered_invoice_prefix,
            workshop_settings: newSettings.workshop_settings,
            booking_settings: newSettings.booking_settings,
            fy_counters: newSettings.fy_counters,
            nonRegisteredCustomerFields: newSettings.nonRegisteredCustomerFields,
            registeredCustomerFields: newSettings.registeredCustomerFields,
            customFields: newSettings.custom_fields,
            enable_extra_charges: newSettings.enable_extra_charges,
            extra_charges_mandatory_for_unregistered: newSettings.extra_charges_mandatory_for_unregistered,
        };
    }
    
      if (error) {
        logError(error, 'getSettings');
        throw new Error(safeErrorMessage(error));
      }

      return data ? {
        ...data,
        companyName: data.company_name,
        gstNo: data.gst_no,
        pinCode: data.pin_code,
        registeredInvoicePrefix: data.registered_invoice_prefix,
        nonRegisteredInvoicePrefix: data.non_registered_invoice_prefix,
        workshop_settings: {
          ...defaults.workshop_settings,
          ...(data.workshop_settings || {})
        },
        booking_settings: {
          ...defaults.booking_settings,
          ...(data.booking_settings || {})
        },
        fy_counters: data.fy_counters || {},
        nonRegisteredCustomerFields: {
            ...defaults.nonRegisteredCustomerFields,
            ...(data.nonRegisteredCustomerFields || {})
        },
        registeredCustomerFields: {
            ...defaults.registeredCustomerFields,
            ...(data.registeredCustomerFields || {})
        },
        customFields: data.custom_fields,
        purchaseItemFields: data.purchase_item_fields,
        purchaseCustomFields: data.purchase_custom_fields,
        enable_extra_charges: data.enable_extra_charges,
        extra_charges_mandatory_for_unregistered: data.extra_charges_mandatory_for_unregistered,
      } : { ...defaults, user_id: userId };
    } catch (error) {
      logError(error, 'getSettings');
      throw new Error(safeErrorMessage(error));
    }
};

export const getNextInvoiceNo = async (invoiceType, date) => {
    const settings = await getSettings();
    const fy = getFinancialYear(date);
    const fy_counters = settings.fy_counters || {};
    const fy_data = fy_counters[fy] || {};
    const counter = fy_data[invoiceType] || 1;

    let prefix = '';
    switch (invoiceType) {
        case 'registered':
            prefix = settings.registeredInvoicePrefix || 'RINV-';
            break;
        case 'non_registered':
            prefix = settings.nonRegisteredInvoicePrefix || 'NRINV-';
            break;
        case 'job_card':
            const jobCardPrefix = settings.workshop_settings?.job_card_prefix || 'JC-';
            prefix = jobCardPrefix;
            break;
        default:
            prefix = 'INV-';
    }

    return `${prefix}${fy.replace('-', '')}-${String(counter).padStart(4, '0')}`;
};

export const incrementInvoiceCounter = async (invoiceType, date) => {
    try {
      await validateSession();
      const userId = await getCurrentUserId();
    const settings = await getSettings();
    const fy = getFinancialYear(date);

    const fy_counters = settings.fy_counters || {};
    if (!fy_counters[fy]) {
        fy_counters[fy] = {};
    }
    const counter = (fy_counters[fy][invoiceType] || 0) + 1;
    fy_counters[fy][invoiceType] = counter;

    const { error } = await supabase
        .from('settings')
        .update({ fy_counters })
        .eq('user_id', userId);

      if (error) {
        logError(error, 'incrementInvoiceCounter');
        throw new Error(safeErrorMessage(error));
      }
    } catch (error) {
      logError(error, 'incrementInvoiceCounter');
      throw new Error(safeErrorMessage(error));
    }
};