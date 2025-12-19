// ============================================
// 🔥 SETTINGS STORE FIX - LOCATION FIELD PERSISTENCE
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getSettings, saveSettings as saveSettingsToDB } from '@/utils/db/settings';

const defaultPurchaseItemFields = {
  modelName: { label: 'Model Name', enabled: true, mandatory: true },
  chassisNo: { label: 'Chassis No', enabled: true, mandatory: true },
  engineNo: { label: 'Engine No', enabled: true, mandatory: true },
  colour: { label: 'Colour', enabled: true, mandatory: false },
  category: { label: 'Category', enabled: true, mandatory: false },
  price: { label: 'Price', enabled: true, mandatory: true },
  hsn: { label: 'HSN', enabled: true, mandatory: false },
  gst: { label: 'GST%', enabled: true, mandatory: false },
  location: { label: 'Location', enabled: false, mandatory: false }, // 🔥 Always include location
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: null,
      isLoading: true,
      isSaving: false,
      error: null,
      
      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await getSettings();
          
          // 🔥 CRITICAL FIX: Always ensure location field exists
          if (data) {
            // Ensure purchaseItemFields exists
            if (!data.purchaseItemFields) {
              data.purchaseItemFields = { ...defaultPurchaseItemFields };
            } else {
              // 🎯 FORCE ADD location field if missing
              if (!data.purchaseItemFields.location) {
                data.purchaseItemFields.location = { 
                  label: 'Location', 
                  enabled: false, 
                  mandatory: false 
                };
              }
            }
            
            // Ensure other required fields
            if (!data.purchaseCustomFields) {
              data.purchaseCustomFields = [];
            }
          }
          
          set({ 
            settings: data || { purchaseItemFields: defaultPurchaseItemFields }, 
            isLoading: false 
          });
          
        } catch (error) {
          console.error('Error fetching settings:', error);
          set({ 
            error: error.message, 
            isLoading: false,
            settings: { purchaseItemFields: defaultPurchaseItemFields }
          });
        }
      },
      
      saveSettings: async () => {
        set({ isSaving: true, error: null });
        try {
          const currentSettings = get().settings;
          
          // 🔥 ENSURE location field is always saved
          if (currentSettings.purchaseItemFields && !currentSettings.purchaseItemFields.location) {
            currentSettings.purchaseItemFields.location = { 
              label: 'Location', 
              enabled: false, 
              mandatory: false 
            };
          }
          
          await saveSettingsToDB(currentSettings);
          
          // 🚀 FORCE REFRESH from database after save
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
            newSettings.purchaseItemFields.location = { 
              label: 'Location', 
              enabled: false, 
              mandatory: false 
            };
          }
          
          return { settings: newSettings };
        });
      },
      
      // 🚀 NEW: Force clear cache and refresh
      clearCacheAndRefresh: async () => {
        // Clear localStorage
        localStorage.removeItem('settings-storage');
        
        // Fetch fresh from database
        await get().fetchSettings();
      },
      
      resetSettings: () => set({ 
        settings: { purchaseItemFields: defaultPurchaseItemFields }, 
        isLoading: false 
      }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
      
      // 🔥 CRITICAL: Merge strategy to preserve location field
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...persistedState };
        
        // Ensure location field exists in merged state
        if (merged.settings?.purchaseItemFields && !merged.settings.purchaseItemFields.location) {
          merged.settings.purchaseItemFields.location = { 
            label: 'Location', 
            enabled: false, 
            mandatory: false 
          };
        }
        
        return merged;
      },
    }
  )
);

export default useSettingsStore;