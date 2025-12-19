import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getSettings, saveSettings as saveSettingsToDB } from '@/utils/db/settings';

const defaultCustomerFields = {
  adharNo: { label: 'Adhar No', enabled: false, mandatory: false },
  nomineeName: { label: 'Nominee Name', enabled: false, mandatory: false },
  hypothecation: { label: 'Hypothecation', enabled: false, mandatory: false },
  rto: { label: 'RTO', enabled: false, mandatory: false },
  emailId: { label: 'Email Id', enabled: false, mandatory: false },
  salesPerson: { label: 'Sales Person', enabled: false, mandatory: false },
};

const defaultPurchaseItemFields = {
  modelName: { label: 'Model Name', enabled: true, mandatory: true },
  chassisNo: { label: 'Chassis No', enabled: true, mandatory: true },
  engineNo: { label: 'Engine No', enabled: true, mandatory: true },
  colour: { label: 'Colour', enabled: true, mandatory: false },
  category: { label: 'Category', enabled: true, mandatory: false },
  price: { label: 'Price', enabled: true, mandatory: true },
  hsn: { label: 'HSN', enabled: true, mandatory: false },
  gst: { label: 'GST%', enabled: true, mandatory: false },
  location: { label: 'Location', enabled: false, mandatory: false },
};



const DEFAULT_SETTINGS = {
  companyName: '',
  gstNo: '',
  pan: '',
  mobile: '',
  address: '',
  state: '',
  district: '',
  pinCode: '',
  bank_details: {
    account_holder_name: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
  },
  company_logo_url: '',
  upi_qr_code_url: '',
  terms_and_conditions: '',
  registeredInvoicePrefix: 'RINV-',
  nonRegisteredInvoicePrefix: 'NRINV-',
  jobCardInvoicePrefix: 'JC-',
  fy_counters: {},
  purchaseItemFields: { ...defaultPurchaseItemFields },
  purchaseCustomFields: [],
  nonRegisteredCustomerFields: { ...defaultCustomerFields },
  registeredCustomerFields: { ...defaultCustomerFields },
  customFields: [],
  enable_extra_charges: false,
  extra_charges_mandatory_for_unregistered: false,
  workshop_settings: {
    show_vehicle_details: true,
    show_labour_items: true,
    show_job_details: true,
    show_customer_details_mandatory: false,
    manual_jc_no_label: "Job Card No.",
    manual_jc_no_mandatory: false,
    enable_uom: false,
    uom_mandatory: false,
    tax_calculation: 'exclusive', // 'inclusive' or 'exclusive'
    show_service_labour_invoice_title: true,
    follow_up_after_service_days: 90,
    follow_up_by_list: [],
    extra_charges: [
        { id: uuidv4(), name: 'Registration' },
        { id: uuidv4(), name: 'Insurance' },
        { id: uuidv4(), name: 'Accessories' },
    ],
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
  }
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: true,
      isSaving: false,
      error: null,
      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await getSettings();
          
          // 🔥 FORCE ENSURE purchaseItemFields with location
          if (data) {
            if (!data.purchaseItemFields) {
              data.purchaseItemFields = { ...defaultPurchaseItemFields };
            } else if (!data.purchaseItemFields.location) {
              data.purchaseItemFields.location = { label: 'Location', enabled: false, mandatory: false };
            }
            
            if (!data.purchaseCustomFields) {
              data.purchaseCustomFields = [];
            }
          }
          
          set({ settings: data || DEFAULT_SETTINGS, isLoading: false });
        } catch (error) {
          console.error('Error fetching settings:', error);
          set({ error: error.message, isLoading: false });
        }
      },
      saveSettings: async () => {
        set({ isSaving: true, error: null });
        try {
          const settings = get().settings;
          
          // 🔥 ENSURE location field before saving
          if (settings.purchaseItemFields && !settings.purchaseItemFields.location) {
            settings.purchaseItemFields.location = { label: 'Location', enabled: false, mandatory: false };
          }
          
          await saveSettingsToDB(settings);
          
          // 🚀 REFRESH from database after save
          await get().fetchSettings();
          
          set({ isSaving: false });
        } catch (error) {
          console.error('Error saving settings:', error);
          set({ error: error.message, isSaving: false });
        }
      },
      updateSettings: (update) => {
        set((state) => {
          const newSettings = { ...state.settings, ...update };
          
          // 🔥 ALWAYS preserve location field
          if (newSettings.purchaseItemFields && !newSettings.purchaseItemFields.location) {
            newSettings.purchaseItemFields.location = { label: 'Location', enabled: false, mandatory: false };
          }
          
          return { settings: newSettings };
        });
      },
      resetSettings: () => set({ settings: DEFAULT_SETTINGS, isLoading: false }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
      
      // 🔥 MERGE STRATEGY: Always ensure location field
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...persistedState };
        
        if (merged.settings?.purchaseItemFields && !merged.settings.purchaseItemFields.location) {
          merged.settings.purchaseItemFields.location = { label: 'Location', enabled: false, mandatory: false };
        }
        
        return merged;
      },
    }
  )
);

export default useSettingsStore;