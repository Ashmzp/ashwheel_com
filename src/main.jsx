import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { Toaster } from "@/components/ui/toaster";
import { NewAuthProvider } from '@/contexts/NewSupabaseAuthContext';
import { HelmetProvider } from 'react-helmet-async';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initGlobalErrorHandlers } from '@/utils/globalErrorHandlers';

// Initialize global error handlers to prevent app crashes
initGlobalErrorHandlers();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=' + new Date().getTime()).catch(() => {});
  });
}

const pdfjsWorker = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
);

try {
  GlobalWorkerOptions.workerSrc = pdfjsWorker.toString();
} catch (error) {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${GlobalWorkerOptions.version}/pdf.worker.min.js`;
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes (optimized for performance)
      staleTime: 5 * 60 * 1000,
      // Keep in memory for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Don't refetch on window focus (better UX)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      // Retry failed requests once
      retry: 1,
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', (e) => {
    e.stopImmediatePropagation();
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <NewAuthProvider>
          <App />
          <Toaster />
        </NewAuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </HelmetProvider>
);