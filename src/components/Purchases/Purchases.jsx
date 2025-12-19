import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import PurchaseList from './PurchaseList';
import PurchaseForm from './PurchaseForm';
import { getPurchases, savePurchase as savePurchaseToDb, deletePurchase as deletePurchaseFromDb } from '@/utils/db/purchases';
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
      
      // Save purchase - DB trigger will handle stock automatically
      console.log('Saving purchase to database...');
      const savedPurchase = await savePurchaseToDb(purchaseData);
      console.log('Purchase saved:', savedPurchase);
      
      setCurrentView('list');
      setSelectedPurchase(null);
    } catch (error) {
      console.error('Error in handleSavePurchase:', error);
      throw error;
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    try {
      // Delete purchase - DB trigger will handle stock cleanup automatically
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