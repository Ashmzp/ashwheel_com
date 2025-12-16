import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { exportToExcel } from '@/utils/excel';
import { formatDate, getStockDays, getStockDaysClass, isDateInRange } from '@/utils/dateUtils';
import { getStock as fetchStockFromDb } from '@/utils/db/stock';
import { getPurchases } from '@/utils/db/purchases';
import { PaginationControls } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import useSettingsStore from '@/stores/settingsStore';

const PAGE_SIZE = 50;

const StockList = () => {
  const { toast } = useToast();
  const purchaseItemFields = useSettingsStore((state) => state.settings.purchaseItemFields || {});
  const purchaseCustomFields = useSettingsStore((state) => state.settings.purchaseCustomFields || []);
  const isLocationEnabled = purchaseItemFields.location?.enabled || false;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useLocalStorage('stockSearchTerm', '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState({
    aging: 'all',
    model: 'all',
    location: 'all'
  });

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['allStockForFiltering'],
    queryFn: () => fetchStockFromDb({ page: 1, pageSize: 500 }),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });

  const { data: purchasesData } = useQuery({
    queryKey: ['purchasesForStock'],
    queryFn: () => getPurchases({ pageSize: 10000 }),
    staleTime: 30 * 60 * 1000,
  });

  const { allStock, modelNames, locations } = useMemo(() => {
    const stock = stockData?.data ?? [];
    const purchases = purchasesData?.data ?? [];
    
    // Merge custom fields from purchases into stock
    const enrichedStock = stock.map(stockItem => {
      const matchingPurchase = purchases.find(p => 
        p.items?.some(item => item.chassisNo === stockItem.chassis_no)
      );
      if (matchingPurchase) {
        const matchingItem = matchingPurchase.items.find(item => item.chassisNo === stockItem.chassis_no);
        return { ...stockItem, ...matchingItem };
      }
      return stockItem;
    });
    
    const models = [...new Set(enrichedStock.map(item => item.model_name))].sort();
    const locs = [...new Set(enrichedStock.map(item => item.location).filter(Boolean))].sort();
    return { allStock: enrichedStock, modelNames: models, locations: locs };
  }, [stockData, purchasesData]);
  
  const filteredStock = useMemo(() => {
    let filtered = allStock;

    if (debouncedSearchTerm) {
      const searchParts = debouncedSearchTerm.split(',').map(part => part.trim().toLowerCase());
      if (searchParts.length === 2 && searchParts[0] && searchParts[1]) {
        const [modelSearch, colorSearch] = searchParts;
        filtered = filtered.filter(item => 
          item.model_name.toLowerCase().includes(modelSearch) && 
          item.colour.toLowerCase().includes(colorSearch)
        );
      } else {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        filtered = filtered.filter(item =>
          item.model_name.toLowerCase().includes(lowerSearch) ||
          item.chassis_no.toLowerCase().includes(lowerSearch) ||
          item.engine_no.toLowerCase().includes(lowerSearch) ||
          item.colour.toLowerCase().includes(lowerSearch) ||
          (item.category && item.category.toLowerCase().includes(lowerSearch))
        );
      }
    }
    
    if (filters.aging !== 'all') {
        filtered = filtered.filter(item => {
            const days = getStockDays(item.purchase_date);
            if (filters.aging === 'new' && days <= 30) return true;
            if (filters.aging === 'medium' && days > 30 && days <= 90) return true;
            if (filters.aging === 'old' && days > 90) return true;
            return false;
        });
    }
    
    if (filters.model !== 'all') {
        filtered = filtered.filter(item => item.model_name === filters.model);
    }
    
    if (filters.location !== 'all') {
        filtered = filtered.filter(item => item.location === filters.location);
    }
    return filtered;
  }, [allStock, debouncedSearchTerm, filters]);

  const { paginatedStock, totalPages, stats } = useMemo(() => {
    const newStockCount = filteredStock.filter(item => getStockDays(item.purchase_date) <= 30).length;
    const mediumStockCount = filteredStock.filter(item => getStockDays(item.purchase_date) > 30 && getStockDays(item.purchase_date) <= 90).length;
    const oldStockCount = filteredStock.filter(item => getStockDays(item.purchase_date) > 90).length;
    const totalValue = filteredStock.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
    
    const calculatedStats = { 
      totalStock: filteredStock.length, 
      newStock: newStockCount, 
      mediumStock: mediumStockCount, 
      oldStock: oldStockCount, 
      totalValue 
    };

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginated = filteredStock.slice(start, end);

    return { 
      paginatedStock: paginated, 
      totalPages: Math.ceil(filteredStock.length / PAGE_SIZE),
      stats: calculatedStats,
    };
  }, [filteredStock, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on filter change
  }, [debouncedSearchTerm, filters]);


  const handleExport = () => {
    if (filteredStock.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const exportData = filteredStock.map(item => {
      const data = {
        'Model Name': item.model_name,
        'Chassis No': item.chassis_no,
        'Engine No': item.engine_no,
        'Colour': item.colour,
        'Category': item.category || 'N/A',
      };
      if (isLocationEnabled) {
        data['Location'] = item.location || 'N/A';
      }
      data['Stock Days'] = getStockDays(item.purchase_date);
      data['Purchase Date'] = formatDate(item.purchase_date);
      data['Price'] = item.price;
      // Add custom fields
      purchaseCustomFields.forEach(field => {
        if (field.name) {
          data[field.name] = item[`custom_${field.id}`] || 'N/A';
        }
      });
      return data;
    });
    exportToExcel(exportData, 'complete_stock_list');
    toast({ title: "Export Successful", description: "Complete stock data has been exported." });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Stock Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle>Total Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalStock}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>New (≤30d)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-500">{stats.newStock}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Medium (31-90d)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-500">{stats.mediumStock}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Old (>90d)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{stats.oldStock}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search model, chassis, color or 'model,color'..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
                <Select value={filters.aging} onValueChange={(value) => setFilters(prev => ({...prev, aging: value}))}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by aging" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Aging</SelectItem>
                        <SelectItem value="new">New (≤30d)</SelectItem>
                        <SelectItem value="medium">Medium (31-90d)</SelectItem>
                        <SelectItem value="old">Old (>90d)</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filters.model} onValueChange={(value) => setFilters(prev => ({...prev, model: value}))}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by model" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Models</SelectItem>
                        {modelNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {isLocationEnabled && (
                  <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({...prev, location: value}))}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by location" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                      </SelectContent>
                  </Select>
                )}
              <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Chassis No</TableHead>
                  <TableHead>Engine No</TableHead>
                  <TableHead>Colour</TableHead>
                  <TableHead>Category</TableHead>
                  {isLocationEnabled && <TableHead>Location</TableHead>}
                  {purchaseCustomFields.map(field => field.name && <TableHead key={field.id}>{field.name}</TableHead>)}
                  <TableHead>Stock Days</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={7 + (isLocationEnabled ? 1 : 0) + purchaseCustomFields.length} className="text-center h-24">Loading stock...</TableCell></TableRow>
                ) : paginatedStock.length > 0 ? paginatedStock.map((item) => {
                  const days = getStockDays(item.purchase_date);
                  const daysClass = getStockDaysClass(days);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.model_name}</TableCell>
                      <TableCell>{item.chassis_no}</TableCell>
                      <TableCell>{item.engine_no}</TableCell>
                      <TableCell>{item.colour}</TableCell>
                      <TableCell>{item.category || 'N/A'}</TableCell>
                      {isLocationEnabled && <TableCell>{item.location || 'N/A'}</TableCell>}
                      {purchaseCustomFields.map(field => field.name && <TableCell key={field.id}>{item[`custom_${field.id}`] || 'N/A'}</TableCell>)}
                      <TableCell className={daysClass}>{days} days</TableCell>
                      <TableCell>₹{parseFloat(item.price || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={7 + (isLocationEnabled ? 1 : 0) + purchaseCustomFields.length} className="text-center h-24">No stock found.</TableCell>
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
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockList;