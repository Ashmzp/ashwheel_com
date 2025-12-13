import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentDate } from '@/utils/dateUtils';
import { startOfMonth, format } from 'date-fns';

const createInitialState = (data = {}) => ({
  id: data.id || null,
  invoice_date: data.invoice_date || getCurrentDate(),
  invoice_no: data.invoice_no || '',
  customer_id: data.customer_id || null,
  customer_name: data.customer_name || '',
  customer_details: data.customer_details || {},
  items: (data.vehicle_invoice_items || []).map(item => ({
    ...item,
    price: parseFloat(item.price || 0),
    discount: parseFloat(item.discount || 0),
    gst: item.gst || '28',
  })),
  extra_charges: data.extra_charges || {},
  total_amount: data.total_amount || 0,
  selectedCustomer: data.customers ? {
    id: data.customer_id,
    customer_name: data.customer_name,
    guardian_name: data.customers.guardian_name,
    mobile1: data.customers.mobile1,
    gst: data.customers.gst,
    address: data.customers.address,
    district: data.customers.district,
    state: data.customers.state,
    pincode: data.customers.pincode,
  } : null,
});

const useShowroomStore = create(
  persist(
    (set) => ({
      ...createInitialState(),
      setFormData: (data) => set((state) => ({ ...state, ...data })),
      resetForm: (initialState) => set(createInitialState(initialState)),
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => ({ items: [...(state.items || []), item] })),
      removeItem: (chassis_no) => set((state) => ({ items: state.items.filter(i => i.chassis_no !== chassis_no) })),
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer, customer_id: customer?.id, customer_name: customer?.customer_name }),
      setCustomerDetails: (details) => set(state => ({ customer_details: {...state.customer_details, ...details} })),
      setExtraCharges: (charges) => set(state => ({ extra_charges: {...state.extra_charges, ...charges} })),
    }),
    {
      name: 'form-showroom-placeholder',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => typeof state[key] !== 'function')
        ),
    }
  )
);

export const initializeShowroomStore = (isEditing, data) => {
  const uniqueKey = isEditing ? `form-edit-vehicle-invoice-${data.id}` : 'form-new-vehicle-invoice';
  useShowroomStore.persist.setOptions({ name: uniqueKey });

  // Force rehydration from the new storage key
  useShowroomStore.persist.rehydrate().then(() => {
    const storedState = useShowroomStore.getState();
    const needsReset = (isEditing && storedState.id !== data.id) || (!isEditing && storedState.id !== null);

    if (needsReset) {
      useShowroomStore.getState().resetForm(isEditing ? data : {});
    }
  });
};

export const clearShowroomStore = (isEditing, id) => {
    const uniqueKey = isEditing ? `form-edit-vehicle-invoice-${id}` : 'form-new-vehicle-invoice';
    try {
        localStorage.removeItem(uniqueKey);
    } catch (e) {
        console.error('Error clearing storage:', e);
    }
    useShowroomStore.getState().resetForm();
    useShowroomStore.persist.setOptions({ name: 'form-showroom-placeholder' });
};

export default useShowroomStore;