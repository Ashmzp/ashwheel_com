import React, { useEffect, useMemo } from 'react';
import '@/styles/responsive.css';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  savePurchase as savePurchaseToDb,
  deletePurchase as deletePurchaseFromDb,
  getPurchases as fetchPurchasesFromDb,
} from '@/utils/db/purchases';
import { Search, Plus, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { exportToExcel } from '@/utils/excel';
import { formatDate, getCurrentMonthDateRange } from '@/utils/dateUtils';
import PurchaseForm from '@/components/Purchases/PurchaseForm';
import { useAuth } from '@/contexts/NewSupabaseAuthContext';
import { PaginationControls } from '@/components/ui/pagination';
import usePurchaseStore, { initializePurchaseStore, clearPurchaseStore } from '@/stores/purchaseStore';
import useUIStore from '@/stores/uiStore';
import usePurchaseUIStore from '@/stores/purchaseUIStore';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

const PurchaseList = ({ purchases, onAddPurchase, onEditPurchase, onDeletePurchase, loading, totalPages, currentPage, onPageChange, searchTerm, setSearchTerm, dateRange, setDateRange, onSearch }) => {
  const { toast } = useToast();
  const { canWrite, canDelete, isExpired } = useAuth();
  const queryClient = useQueryClient();

  const handleDelete = async (purchaseId) => {
    if (window.confirm('Are you sure? This will also remove related items from stock.')) {
      try {
        await onDeletePurchase(purchaseId);
        toast({ title: "Success", description: "Purchase deleted successfully!" });
      } catch (error) {
        toast({ title: "Error", description: `Failed to delete purchase. ${error.message}`, variant: "destructive" });
      }
    }
  };

  const handleExport = async () => {
    try {
      const allData = await queryClient.fetchQuery({
        queryKey: ['purchases', 'all', searchTerm, dateRange],
        queryFn: () => fetchPurchasesFromDb({
          page: 1,
          pageSize: 10000, // Fetch all
          searchTerm,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }),
      });

      if (!allData || !allData.data || allData.data.length === 0) {
        toast({ title: "Info", description: "No data to export for the current filters." });
        return;
      }

      const dataToExport = allData.data.flatMap(p =>
        (p.items || []).map(item => ({
          'Party Name': p.party_name,
          'Invoice Date': formatDate(p.invoice_date),
          'Invoice Number': p.invoice_no,
          'Model Name': item.modelName,
          'Chassis Number': item.chassisNo,
          'Engine Number': item.engineNo,
          'Colour': item.colour,
          'HSN Code': item.hsn,
          'GST %': item.gst,
          'Price': item.price,
          'Category': item.category,
        }))
      );

      exportToExcel(dataToExport, 'purchases_report');
      toast({ title: "Success", description: "Data exported to Excel." });
    } catch (error) {
      toast({ title: "Export Error", description: `Failed to export data: ${error.message}`, variant: "destructive" });
    }
  };

  const highlightedChassisNos = useMemo(() => {
    if (!searchTerm || purchases.length === 0) return new Set();
    const lowerSearchTerm = searchTerm.toLowerCase();
    const chassisSet = new Set();
    purchases.forEach(p => {
      (p.items || []).forEach(item => {
        if (
          item.chassis_no?.toLowerCase().includes(lowerSearchTerm) ||
          item.engine_no?.toLowerCase().includes(lowerSearchTerm)
        ) {
          chassisSet.add(p.id);
        }
      });
    });
    return chassisSet;
  }, [searchTerm, purchases]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Vehicle Purchases</h1>
        {canWrite('purchases') && (
          <Button onClick={onAddPurchase}><Plus className="w-4 h-4 mr-2" /> Add Purchase</Button>
        )}
      </div>

      {isExpired && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-md mb-4">
          ⚠️ Your subscription has expired. You are in READ-ONLY mode. Contact admin for renewal.
        </div>
      )}

      <Card>
        <CardHeader className="card-compact">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search Party, Invoice, Chassis, Engine..." className="input-compact pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-auto" />
              <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-auto" />
              <Button onClick={onSearch}><Search className="mr-2 h-4 w-4" /> Search</Button>
              <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="card-compact">
          <div className="scrollable-container">
            <Table className="table-compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">Loading purchases...</TableCell></TableRow>
                ) : purchases.length > 0 ? purchases.map((purchase) => (
                  <TableRow
                    key={purchase.id}
                    className={cn(highlightedChassisNos.has(purchase.id) && 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200')}
                  >
                    <TableCell>{purchase.serial_no}</TableCell>
                    <TableCell>{formatDate(purchase.invoice_date)}</TableCell>
                    <TableCell>{purchase.invoice_no}</TableCell>
                    <TableCell>{purchase.party_name}</TableCell>
                    <TableCell>{purchase.items?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      {canWrite('purchases') && (
                        <Button variant="ghost" className="btn-compact" onClick={() => onEditPurchase(purchase)}><Edit className="h-4 w-4" /></Button>
                      )}
                      {canDelete('purchases') && (
                        <Button variant="ghost" className="btn-compact" className="text-red-500" onClick={() => handleDelete(purchase.id)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No purchases found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


const PurchasesPage = () => {
  const { openForm, setOpenForm, closeForm } = useUIStore();
  const { searchTerm, setSearchTerm, dateRange, setDateRange, currentPage, setCurrentPage } = usePurchaseUIStore();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const PAGE_SIZE = 50;

  const showForm = openForm?.type === 'purchase';
  const isEditing = openForm?.mode === 'edit';
  const editingId = openForm?.id;

  const [searchDateRange, setSearchDateRange] = React.useState(dateRange);

  const queryKey = ['purchases', currentPage, debouncedSearchTerm, searchDateRange];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchPurchasesFromDb({
      page: currentPage,
      pageSize: PAGE_SIZE,
      searchTerm: debouncedSearchTerm,
      startDate: searchDateRange.start,
      endDate: searchDateRange.end,
    }),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const purchases = data?.data ?? [];
  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  useEffect(() => {
    if (!showForm) return;

    const selectedPurchase = isEditing
      ? purchases.find(p => p.id === editingId)
      : undefined;

    // Only initialize if not already initialized for this mode/id
    if (!usePurchaseStore.getState().initializedFor) {
      initializePurchaseStore(isEditing, selectedPurchase);
    }
  }, [showForm, isEditing, editingId, purchases]);

  const saveMutation = useMutation({
    mutationFn: async (purchaseData) => {
      // Pass existing purchase for optimization
      const existingPurchase = isEditing ? purchases.find(p => p.id === editingId) : null;
      const savedData = await savePurchaseToDb(purchaseData, existingPurchase);
      return savedData;
    },
    onSuccess: (savedData) => {
      toast({
        title: "Success",
        description: `Purchase ${isEditing ? 'updated' : 'created'} successfully.`
      });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockCount'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      handleCancel();
    },
    onError: (error) => {
      console.error("Failed to save purchase and update stock:", error);
      toast({
        title: "Error",
        description: `Failed to save purchase. ${error.message}`,
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ purchaseId }) => {
      // DB trigger will handle stock cleanup on purchase delete
      await deletePurchaseFromDb(purchaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockCount'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete purchase. ${error.message}`, variant: "destructive" });
    }
  });

  const handleAddPurchase = () => setOpenForm({ type: 'purchase', mode: 'new' });
  const handleEditPurchase = (purchase) => setOpenForm({ type: 'purchase', mode: 'edit', id: purchase.id });
  const handleSavePurchase = (purchaseData) => saveMutation.mutate(purchaseData);
  const handleDeletePurchase = (purchaseId) => deleteMutation.mutate({ purchaseId });

  const handleCancel = () => {
    clearPurchaseStore();
    closeForm();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearch = () => {
    setSearchDateRange(dateRange);
    setCurrentPage(1);
  };

  // Auto-fetch only on search term change, not on date change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  return (
    <>
      <Helmet>
        <title>Purchases - Showroom Pro</title>
        <meta name="description" content="Manage all your vehicle purchases." />
      </Helmet>
      <div className="container-responsive py-3 md:py-4">
        {showForm ? (
          <PurchaseForm
            onSave={handleSavePurchase}
            onCancel={handleCancel}
            editingPurchase={isEditing ? purchases.find(p => p.id === editingId) : null}
          />
        ) : (
          <PurchaseList
            purchases={purchases}
            onAddPurchase={handleAddPurchase}
            onEditPurchase={handleEditPurchase}
            onDeletePurchase={handleDeletePurchase}
            loading={isLoading}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onSearch={handleSearch}
          />
        )}
      </div>
    </>
  );
};

export default PurchasesPage;