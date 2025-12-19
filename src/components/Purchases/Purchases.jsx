import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import PurchaseList from './PurchaseList';
import PurchaseForm from './PurchaseForm';
import { getPurchases, savePurchase as savePurchaseToDb, deletePurchase as deletePurchaseFromDb } from '@/utils/db/purchases';
import { addStock, deleteStockByChassis } from '@/utils/db/stock';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/NewSupabaseAuthContext';

const Purchases = () => {
  const [currentView, setCurrentView] = useState('list');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const { user } = useAuth();

  const handleAddPurchase = () => {
    setSelectedPurchase(null);
    setCurrentView('form');
  };

  const handleEditPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setCurrentView('form');
  };

  const handleSavePurchase = async (purchaseData) => {
    try {
      console.log('handleSavePurchase called with:', purchaseData);
      const isUpdating = !!selectedPurchase;

      if(isUpdating) {
          // Remove old items from stock
          const oldPurchase = selectedPurchase;
          if (oldPurchase.items && oldPurchase.items.length > 0) {
            const oldChassisNos = oldPurchase.items.map(item => item.chassisNo).filter(Boolean);
            if (oldChassisNos.length > 0) {
              await deleteStockByChassis(oldChassisNos);
            }
          }
      }
      
      // Save purchase
      console.log('Saving purchase to database...');
      const savedPurchase = await savePurchaseToDb(purchaseData);
      console.log('Purchase saved:', savedPurchase);
      
      // Add new items to stock
      if (purchaseData.items && purchaseData.items.length > 0) {
          const validItems = purchaseData.items.filter(item => 
            item.modelName && item.chassisNo && item.price
          );
          
          if (validItems.length > 0) {
            const newStockItems = validItems.map(item => ({
              id: uuidv4(),
              purchase_id: savedPurchase.id,
              model_name: item.modelName,
              chassis_no: item.chassisNo,
              engine_no: item.engineNo || '',
              colour: item.colour || '',
              hsn: item.hsn || '',
              gst: item.gst || 0,
              price: item.price,
              purchase_date: savedPurchase.invoice_date,
              user_id: user.id,
            }));
            console.log('Adding stock items:', newStockItems);
            await addStock(newStockItems);
          }
      }
      
      setCurrentView('list');
      setSelectedPurchase(null);
    } catch (error) {
      console.error('Error in handleSavePurchase:', error);
      throw error;
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    try {
      const { data: purchases } = await getPurchases();
      const purchaseToDelete = purchases.find(p => p.id === purchaseId);
      if(purchaseToDelete && purchaseToDelete.items && purchaseToDelete.items.length > 0){
          const chassisNosToDelete = purchaseToDelete.items
            .map(item => item.chassisNo || item.chassis_no)
            .filter(Boolean);
          if (chassisNosToDelete.length > 0) {
            await deleteStockByChassis(chassisNosToDelete);
          }
      }
      await deletePurchaseFromDb(purchaseId);
      setCurrentView('list');
    } catch (error) {
      console.error('Error deleting purchase:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setSelectedPurchase(null);
  };

  return (
    <>
      <Helmet>
        <title>Purchase Management - Showroom Management System</title>
        <meta name="description" content="Manage vehicle purchases with comprehensive tracking of chassis numbers, engine numbers, and automatic stock management integration." />
      </Helmet>

      <div className="p-6">
        {currentView === 'list' ? (
          <PurchaseList
            onAddPurchase={handleAddPurchase}
            onEditPurchase={handleEditPurchase}
            onDeletePurchase={handleDeletePurchase}
          />
        ) : (
          <PurchaseForm
            purchase={selectedPurchase}
            onSave={handleSavePurchase}
            onCancel={handleCancel}
          />
        )}
      </div>
    </>
  );
};

export default Purchases;