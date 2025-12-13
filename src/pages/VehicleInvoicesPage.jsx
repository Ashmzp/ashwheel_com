import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useReactToPrint } from 'react-to-print';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteVehicleInvoice as deleteVehicleInvoiceFromDb,
  getSettings,
  saveVehicleInvoice as saveVehicleInvoiceToDb,
} from '@/utils/db';
import { supabase } from '@/lib/customSupabaseClient';
import { addStock } from '@/utils/db/stock';
import VehicleInvoiceList from '@/components/VehicleInvoices/VehicleInvoiceList';
import VehicleInvoiceForm from '@/components/VehicleInvoices/VehicleInvoiceForm';
import { useAuth } from '@/contexts/NewSupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import DeliveryChallan from '@/components/Invoices/DeliveryChallan';
import TaxInvoice from '@/components/Invoices/TaxInvoice';
import { initializeShowroomStore, clearShowroomStore } from '@/stores/showroomStore';
import useUIStore from '@/stores/uiStore';
import debounce from 'debounce';
import { getCurrentDate } from '@/utils/dateUtils';
import useVehicleInvoiceStore from '@/stores/vehicleInvoiceStore';
import { DEFAULT_QUERY_CONFIG } from '@/utils/queryConfig';

const PAGE_SIZE = 50;

const VehicleInvoicesPage = () => {
  const { openForm, setOpenForm, closeForm } = useUIStore();
  const [printData, setPrintData] = useState(null);

  const { user, canAccess } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const showForm = openForm?.type === 'vehicle_invoice';
  const isEditing = openForm?.mode === 'edit';
  const editingId = openForm?.id;

  const {
    searchTerm,
    dateRange,
    pagination,
    setSearchTerm,
    setDateRange,
    setPagination,
  } = useVehicleInvoiceStore();

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [searchDateRange, setSearchDateRange] = useState(dateRange);

  const challanPrintRef = useRef();
  const invoicePrintRef = useRef();

  const debouncedSetSearch = useCallback(debounce(setDebouncedSearchTerm, 300), []);
  useEffect(() => {
    debouncedSetSearch(searchTerm);
    setPagination({ currentPage: 1 });
  }, [searchTerm, debouncedSetSearch, setPagination]);

  // Removed auto-fetch on date change - user must click Search button

  const queryKey = ['vehicleInvoices', searchDateRange, debouncedSearchTerm, pagination.currentPage, user.id];

  const { data, isLoading: queryLoading, error: queryError } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        // Search in items table first if search term exists
        let invoiceIds = null;
        if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
          const { data: itemsData } = await supabase
            .from('vehicle_invoice_items')
            .select('invoice_id')
            .eq('user_id', user.id)
            .or(`chassis_no.ilike.%${debouncedSearchTerm}%,engine_no.ilike.%${debouncedSearchTerm}%,model_name.ilike.%${debouncedSearchTerm}%`);

          if (itemsData && itemsData.length > 0) {
            invoiceIds = [...new Set(itemsData.map(item => item.invoice_id))];
          }
        }

        // Build main query
        let query = supabase
          .from('vehicle_invoices')
          .select('*, vehicle_invoice_items(*), customers(*)', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('invoice_date', searchDateRange.start)
          .lte('invoice_date', searchDateRange.end)
          .order('invoice_date', { ascending: false });

        // Apply search filter
        if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
          if (invoiceIds && invoiceIds.length > 0) {
            query = query.or(`invoice_no.ilike.%${debouncedSearchTerm}%,customer_name.ilike.%${debouncedSearchTerm}%,id.in.(${invoiceIds.join(',')})`);
          } else {
            query = query.or(`invoice_no.ilike.%${debouncedSearchTerm}%,customer_name.ilike.%${debouncedSearchTerm}%`);
          }
        }

        query = query.range((pagination.currentPage - 1) * PAGE_SIZE, pagination.currentPage * PAGE_SIZE - 1);

        const { data: invoicesData, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch invoices: ${error.message}`);
        }

        // Transform data to match expected format
        const transformedInvoices = (invoicesData || []).map(inv => ({
          invoice_id: inv.id,
          invoice_no: inv.invoice_no,
          invoice_date: inv.invoice_date,
          customer_name: inv.customer_name,
          grand_total: inv.total_amount,
          customer: inv.customers,
          items: inv.vehicle_invoice_items,
          customer_details_json: inv.customer_details,
          extra_charges_json: inv.extra_charges,
          model_name: inv.vehicle_invoice_items?.map(i => i.model_name).join(', '),
          chassis_no: inv.vehicle_invoice_items?.map(i => i.chassis_no).join(', '),
          engine_no: inv.vehicle_invoice_items?.map(i => i.engine_no).join(', '),
        }));

        return { invoices: transformedInvoices, totalCount: count || 0 };
      } catch (error) {
        throw new Error(error.message || 'Failed to load vehicle invoices');
      }
    },
    enabled: !!searchDateRange.start && !!searchDateRange.end && !!user,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    ...DEFAULT_QUERY_CONFIG,
  });

  const invoices = data?.invoices || [];
  const totalCount = data?.totalCount || 0;


  useEffect(() => {
    setPagination({
      totalCount,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    });
  }, [totalCount, setPagination]);

  useEffect(() => {
    if (showForm) {
      const fetchAndInit = async () => {
        try {
          if (isEditing) {
            const { data: invoiceData, error } = await supabase
              .from('vehicle_invoices')
              .select('*, vehicle_invoice_items(*), customers(*)')
              .eq('id', editingId)
              .eq('user_id', user.id)
              .single();

            if (error) {
              toast({
                title: "Error",
                description: `Could not fetch invoice for editing: ${error.message}`,
                variant: 'destructive'
              });
              closeForm();
              return;
            }

            if (!invoiceData) {
              toast({
                title: "Not Found",
                description: "The invoice you were editing could not be found.",
                variant: 'destructive'
              });
              closeForm();
              return;
            }

            initializeShowroomStore(true, invoiceData);
          } else {
            initializeShowroomStore(false, null);
          }
        } catch (error) {
          toast({
            title: "Error",
            description: `Failed to initialize form: ${error.message}`,
            variant: 'destructive'
          });
          closeForm();
        }
      }
      fetchAndInit();
    }
    
    // Cleanup on unmount only
    return () => {
      if (!showForm) {
        clearShowroomStore(isEditing, editingId);
      }
    };
  }, [showForm, isEditing, editingId, toast, closeForm, user.id]);

  const handlePrintChallan = useReactToPrint({
    content: () => challanPrintRef.current,
    onAfterPrint: () => setPrintData(null),
  });

  const handlePrintInvoice = useReactToPrint({
    content: () => invoicePrintRef.current,
    onAfterPrint: () => setPrintData(null),
  });

  const triggerPrint = async (type, invoice) => {
    try {
      const customer = invoice.customer || invoice.customer_details_json;
      const items = invoice.items || [];
      const settings = await queryClient.fetchQuery({
        queryKey: ['settings'],
        queryFn: getSettings
      });

      if (!customer || items.length === 0 || !settings) {
        toast({
          title: "Error",
          description: "Could not fetch all data required for printing.",
          variant: "destructive"
        });
        return;
      }
      
      const invoiceWithExtraCharges = {
        ...invoice,
        extra_charges: invoice.extra_charges_json || invoice.extra_charges || {},
        customer_details_json: invoice.customer_details_json || {}
      };
      
      setPrintData({ type, invoice: invoiceWithExtraCharges, customer, items, settings });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to prepare print data: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (printData) {
      if (printData.type === 'DeliveryChallan') handlePrintChallan();
      if (printData.type === 'TaxInvoice') handlePrintInvoice();
    }
  }, [printData, handlePrintChallan, handlePrintInvoice]);

  const handleAddInvoice = () => {
    setOpenForm({ type: 'vehicle_invoice', mode: 'new' });
  };

  const handleEditInvoice = async (invoice) => {
    setOpenForm({ type: 'vehicle_invoice', mode: 'edit', id: invoice.invoice_id });
  };

  const saveInvoiceMutation = useMutation({
    mutationFn: saveVehicleInvoiceToDb,
    onSuccess: () => {
      // Invalidate instead of refetch for faster UX
      queryClient.invalidateQueries({ queryKey: ['vehicleInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockCount'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const handleSaveInvoice = async (invoiceData) => {
    try {
      await saveInvoiceMutation.mutateAsync(invoiceData);

      toast({
        title: "Success",
        description: `Invoice ${!invoiceData.id ? 'created' : 'updated'} successfully! Stock has been updated.`
      });

      clearShowroomStore(isEditing, editingId);
      closeForm();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save invoice: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId) => {
      try {
        const { data: itemsToRestore, error } = await supabase
          .from('vehicle_invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId);

        if (error) throw new Error(`Failed to fetch items: ${error.message}`);

        await deleteVehicleInvoiceFromDb(invoiceId);

        if (itemsToRestore && itemsToRestore.length > 0) {
          const stockItems = itemsToRestore.map(item => ({
            chassis_no: item.chassis_no,
            engine_no: item.engine_no,
            model_name: item.model_name,
            colour: item.colour,
            price: item.price,
            gst: item.gst,
            hsn: item.hsn,
            purchase_date: new Date().toISOString().split('T')[0],
          }));
          await addStock(stockItems);
        }
      } catch (error) {
        throw new Error(error.message || 'Failed to delete invoice');
      }
    },
    onSuccess: () => {
      toast({
        title: "Invoice Deleted",
        description: "Invoice deleted and items have been restored to stock.",
      });
      // Invalidate instead of refetch for faster UX
      queryClient.invalidateQueries({ queryKey: ['vehicleInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stockCount'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete invoice: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleDeleteInvoice = async (invoiceId) => {
    await deleteInvoiceMutation.mutateAsync(invoiceId);
  };

  const handleCancel = () => {
    clearShowroomStore(isEditing, editingId);
    closeForm();
  };

  const handleSearch = () => {
    setSearchDateRange(dateRange);
    setPagination({ currentPage: 1 });
  };

  const PrintComponent = () => {
    if (!printData) return null;
    const { invoice, customer, items, settings } = printData;

    return (
      <div className="hidden">
        <DeliveryChallan ref={challanPrintRef} invoice={invoice} customer={customer} items={items} settings={settings} />
        <TaxInvoice ref={invoicePrintRef} invoice={invoice} customer={customer} items={items} settings={settings} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Vehicle Invoices - Showroom Pro</title>
        <meta name="description" content="Create and manage vehicle invoices with real-time stock adjustment." />
      </Helmet>
      <div className="container-responsive py-3 md:py-4">
        {showForm ? (
          <VehicleInvoiceForm
            onSave={handleSaveInvoice}
            onCancel={handleCancel}
          />
        ) : (
          <VehicleInvoiceList
            invoices={invoices}
            onAddInvoice={handleAddInvoice}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onPrint={triggerPrint}
            loading={queryLoading}
            canAccess={canAccess}
            summaryData={null}
            summaryLoading={false}
            dateRange={dateRange}
            setDateRange={setDateRange}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pagination={{ ...pagination, totalCount }}
            setPagination={setPagination}
            onSearch={handleSearch}
          />
        )}
      </div>
      <PrintComponent />
    </>
  );
};

export default VehicleInvoicesPage;