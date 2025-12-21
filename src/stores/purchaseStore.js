import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentDate } from '@/utils/dateUtils';

const createInitialState = (data = {}) => ({
  id: null,
  created_at: null,
  invoiceDate: getCurrentDate(),
  invoiceNo: '',
  partyName: '',
  items: [],
  serial_no: 0,
  initializedFor: null, // 'new' | <id> | null
  ...data,
});

const usePurchaseStore = create(
  persist(
    (set, get) => ({
      ...createInitialState(),

      // basic setters
      setFormData: (data) => set((state) => ({ ...state, ...data })),
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      updateItem: (id, updatedFields) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updatedFields } : item
          ),
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      // initialize the form for either 'new' or editing an existing purchase
      initialize: (mode, data = null) => {
        const state = get();
        const target = mode === 'edit' && data?.id ? data.id : (mode === 'new' ? 'new' : null);
        
        console.log('🔍 Initialize called:', { mode, hasData: !!data, target, currentInit: state.initializedFor });
        console.log('🔍 Data received:', data);
        console.log('🔍 Items in data:', data?.items);
        
        if (state.initializedFor === target) {
          console.log('⚠️ Already initialized for:', target);
          // already initialized for same mode/id -> no-op
          return;
        }

        if (mode === 'edit' && data) {
          console.log('✅ Edit mode - converting items');
          // Convert DB items format to frontend format
          const convertedItems = (data.items || []).map((item, index) => {
            console.log('Converting item:', item);
            return {
              id: `edit_${Date.now()}_${index}`,
              modelName: item.model_name || item.modelName || '',
              chassisNo: item.chassis_no || item.chassisNo || '',
              engineNo: item.engine_no || item.engineNo || '',
              colour: item.colour || '',
              category: item.category || '',
              price: item.price || '0',
              hsn: item.hsn || '',
              gst: item.gst_rate || item.gst || '28',
              location: item.location || '',
              // Handle custom fields
              ...(item.custom_fields || item.customFields || {})
            };
          });

          console.log('✅ Converted items:', convertedItems);

          set({
            ...createInitialState({
              id: data.id,
              created_at: data.created_at ?? null,
              invoiceDate: data.invoice_date ?? getCurrentDate(),
              invoiceNo: data.invoice_no ?? '',
              partyName: data.party_name ?? '',
              items: convertedItems,
              serial_no: data.serial_no ?? 0,
            }),
            initializedFor: data.id,
          });
          
          console.log('✅ Store updated with items:', convertedItems.length);
        } else {
          console.log('✅ New mode - empty items');
          // new
          set({
            ...createInitialState(),
            initializedFor: 'new',
          });
        }
      },

      // fully reset form and clear initializedFor
      clear: () => set({ ...createInitialState(), initializedFor: null }),
    }),
    {
      name: 'purchase-form', // single stable storage key
      storage: createJSONStorage(() => localStorage),
      // persist only data fields
      partialize: (state) =>
        ({
          id: state.id,
          created_at: state.created_at,
          invoiceDate: state.invoiceDate,
          invoiceNo: state.invoiceNo,
          partyName: state.partyName,
          items: state.items,
          serial_no: state.serial_no,
          initializedFor: state.initializedFor,
        }),
    }
  )
);

const initializePurchaseStore = (isEditing, data) => {
  const mode = isEditing ? 'edit' : 'new';
  usePurchaseStore.getState().initialize(mode, data);
};

const clearPurchaseStore = () => {
  // clear persisted storage and reset store
  try {
    localStorage.removeItem('purchase-form');
  } catch (e) {
    console.warn('Unable to remove purchase-form from localStorage', e);
  }
  usePurchaseStore.getState().clear();
};

export default usePurchaseStore;
export { initializePurchaseStore, clearPurchaseStore };