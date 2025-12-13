import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/NewSupabaseAuthContext';

// Direct imports - NO lazy loading
import HomePage from '@/pages/HomePage';
import UserLogin from '@/pages/UserLogin';
import AdminLogin from '@/pages/AdminLogin';
import SignupPage from '@/pages/SignupPage';
import AuthCallback from '@/pages/AuthCallback';
import Dashboard from '@/components/Dashboard/Dashboard';
import CustomersPage from '@/pages/CustomersPage';
import PurchasesPage from '@/pages/PurchasesPage';
import StockPage from '@/pages/StockPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import UserProfile from '@/pages/UserProfile';
import AdminDashboard from '@/pages/AdminDashboard';
import UserManagementPage from '@/pages/UserManagementPage';
import VehicleInvoicesPage from '@/pages/VehicleInvoicesPage';
import SalesReturnPage from '@/pages/SalesReturnPage';
import PurchaseReturnPage from '@/pages/PurchaseReturnPage';
import BookingsPage from '@/pages/BookingsPage';
import MISReportPage from '@/pages/MISReportPage';
import JobCardPage from '@/pages/Workshop/JobCardPage';
import JobCardPrintPage from '@/pages/Workshop/JobCardPrintPage';
import WorkshopInventoryPage from '@/pages/Workshop/WorkshopInventoryPage';
import WorkshopPurchasesPage from '@/pages/Workshop/WorkshopPurchasesPage';
import WpReturnPage from '@/pages/Workshop/WpReturnPage';
import WsReturnPage from '@/pages/Workshop/WsReturnPage';
import FollowUpPage from '@/pages/Workshop/FollowUpPage';
import JournalEntryPage from '@/pages/JournalEntryPage';
import JournalEntrySettingsPage from '@/pages/JournalEntrySettingsPage';
import PartyLedgerPage from '@/pages/PartyLedgerPage';
import ReceiptPage from '@/pages/ReceiptPage';
import AshwheelProPage from '@/pages/AshwheelProPage';
import AboutUsPage from '@/pages/AboutUsPage';
import ContactPage from '@/pages/ContactPage';
import FeedbackPage from '@/pages/FeedbackPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsAndConditionsPage from '@/pages/TermsAndConditionsPage';
import PdfEditorPage from '@/pages/tools/PdfEditorPage';
import SplitPdfPage from '@/pages/tools/SplitPdfPage';
import PdfMergerPage from '@/pages/tools/PdfMergerPage';
import CompressPdfPage from '@/pages/tools/PdfCompressorPage';
import PdfToJpegPage from '@/pages/tools/PdfToJpegPage';
import PdfToTextPage from '@/pages/tools/PdfToTextPage';
import JpegToPdfPage from '@/pages/tools/JpegToPdfPage';
import WordToPdfPage from '@/pages/tools/WordToPdfPage';
import CanvasCraftPage from '@/pages/tools/CanvasCraftPage';
import CropAnythingPage from '@/pages/tools/CropAnythingPage';
import ImageCompressorPage from '@/pages/tools/ImageCompressorPage';
import ImageResizerPage from '@/pages/tools/ImageResizerPage';
import JpegToPngPage from '@/pages/tools/JpegToPngPage';
import PngToJpegPage from '@/pages/tools/PngToJpegPage';
import PassportPhotoMakerPage from '@/pages/tools/PassportPhotoMakerPage';
import AadhaarFormatterPage from '@/pages/tools/AadhaarFormatterPage';
import PasswordGeneratorPage from '@/pages/tools/PasswordGeneratorPage';
import UnitConverterPage from '@/pages/tools/UnitConverterPage';
import ColorPickerPage from '@/pages/tools/ColorPickerPage';
import TextCaseConverterPage from '@/pages/tools/TextCaseConverterPage';
import BmiCalculatorPage from '@/pages/tools/BmiCalculatorPage';
import JsonFormatterPage from '@/pages/tools/JsonFormatterPage';
import PomodoroTimerPage from '@/pages/tools/PomodoroTimerPage';
import TextSummarizerPage from '@/pages/tools/TextSummarizerPage';
import HabitTrackerPage from '@/pages/tools/HabitTrackerPage';
import PollMakerPage from '@/pages/tools/PollMakerPage';
import ThumbnailDownloaderPage from '@/pages/tools/ThumbnailDownloaderPage';
import WordCounterPage from '@/pages/tools/WordCounterPage';
import QrCodeGeneratorPage from '@/pages/tools/QrCodeGeneratorPage';
import MagicQrCodeGeneratorPage from '@/pages/tools/MagicQrCodeGeneratorPage';
import GstCalculatorPage from '@/pages/tools/GstCalculatorPage';
import EmiCalculatorPage from '@/pages/tools/EmiCalculatorPage';
import SipCalculatorPage from '@/pages/tools/SipCalculatorPage';
import TaxableAmountCalculatorPage from '@/pages/tools/TaxableAmountCalculatorPage';
import AgeCalculatorPage from '@/pages/tools/AgeCalculatorPage';
import DateDifferenceCalculatorPage from '@/pages/tools/DateDifferenceCalculatorPage';
import UrlShortenerPage from '@/pages/tools/UrlShortenerPage';
import InvoiceGeneratorPage from '@/pages/tools/InvoiceGeneratorPage';
import ResumeBuilderPage from '@/pages/tools/ResumeBuilderPage';
import MarriageBiodataMakerPage from '@/pages/tools/MarriageBiodataMakerPage';
import ResetPassword from '@/pages/ResetPassword';
import ForgotPassword from '@/pages/ForgotPassword';
import PlaceholderPage from '@/pages/PlaceholderPage';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Static Pages */}
        <Route path="/ashwheel-pro" element={<AshwheelProPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-conditions" element={<TermsAndConditionsPage />} />

        {/* Tool Routes */}
        <Route path="/tools/pdf-editor" element={<PdfEditorPage />} />
        <Route path="/tools/split-pdf" element={<SplitPdfPage />} />
        <Route path="/tools/merge-pdf" element={<PdfMergerPage />} />
        <Route path="/tools/compress-pdf" element={<CompressPdfPage />} />
        <Route path="/tools/pdf-to-jpeg" element={<PdfToJpegPage />} />
        <Route path="/tools/pdf-to-text" element={<PdfToTextPage />} />
        <Route path="/tools/jpeg-to-pdf" element={<JpegToPdfPage />} />
        <Route path="/tools/word-to-pdf" element={<WordToPdfPage />} />
        <Route path="/tools/canvas-craft" element={<CanvasCraftPage />} />
        <Route path="/tools/crop-anything" element={<CropAnythingPage />} />
        <Route path="/tools/image-compressor" element={<ImageCompressorPage />} />
        <Route path="/tools/image-resizer" element={<ImageResizerPage />} />
        <Route path="/tools/jpeg-to-png" element={<JpegToPngPage />} />
        <Route path="/tools/png-to-jpeg" element={<PngToJpegPage />} />
        <Route path="/tools/passport-photo-maker" element={<PassportPhotoMakerPage />} />
        <Route path="/tools/aadhaar-formatter" element={<AadhaarFormatterPage />} />
        <Route path="/tools/password-generator" element={<PasswordGeneratorPage />} />
        <Route path="/tools/unit-converter" element={<UnitConverterPage />} />
        <Route path="/tools/color-picker" element={<ColorPickerPage />} />
        <Route path="/tools/text-case-converter" element={<TextCaseConverterPage />} />
        <Route path="/tools/bmi-calculator" element={<BmiCalculatorPage />} />
        <Route path="/tools/json-formatter" element={<JsonFormatterPage />} />
        <Route path="/tools/pomodoro-timer" element={<PomodoroTimerPage />} />
        <Route path="/tools/text-summarizer" element={<TextSummarizerPage />} />
        <Route path="/tools/habit-tracker" element={<HabitTrackerPage />} />
        <Route path="/tools/poll-maker" element={<PollMakerPage />} />
        <Route path="/tools/thumbnail-downloader" element={<ThumbnailDownloaderPage />} />
        <Route path="/tools/word-counter" element={<WordCounterPage />} />
        <Route path="/tools/qr-code-generator" element={<QrCodeGeneratorPage />} />
        <Route path="/tools/magic-qr-code-generator" element={<MagicQrCodeGeneratorPage />} />
        <Route path="/tools/gst-calculator" element={<GstCalculatorPage />} />
        <Route path="/tools/emi-calculator" element={<EmiCalculatorPage />} />
        <Route path="/tools/sip-calculator" element={<SipCalculatorPage />} />
        <Route path="/tools/taxable-amount-calculator" element={<TaxableAmountCalculatorPage />} />
        <Route path="/tools/age-calculator" element={<AgeCalculatorPage />} />
        <Route path="/tools/date-difference-calculator" element={<DateDifferenceCalculatorPage />} />
        <Route path="/tools/url-shortener" element={<UrlShortenerPage />} />
        <Route path="/tools/invoice-generator" element={<InvoiceGeneratorPage />} />
        <Route path="/tools/resume-builder" element={<ResumeBuilderPage />} />
        <Route path="/tools/marriage-biodata-maker" element={<MarriageBiodataMakerPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute module="customers"><CustomersPage /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute module="purchases"><PurchasesPage /></ProtectedRoute>} />
        <Route path="/purchase-returns" element={<ProtectedRoute module="purchase_returns"><PurchaseReturnPage /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute module="stock"><StockPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />
        <Route path="/vehicle-invoices" element={<ProtectedRoute module="vehicle_invoices"><VehicleInvoicesPage /></ProtectedRoute>} />
        <Route path="/sales-returns" element={<ProtectedRoute module="sales_returns"><SalesReturnPage /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute module="bookings"><BookingsPage /></ProtectedRoute>} />
        <Route path="/mis-report" element={<ProtectedRoute module="mis_report"><MISReportPage /></ProtectedRoute>} />

        {/* Journal Entry Module */}
        <Route path="/journal-entry" element={<ProtectedRoute module="journal_entry"><JournalEntryPage /></ProtectedRoute>} />
        <Route path="/journal-entry-settings" element={<ProtectedRoute module="journal_entry"><JournalEntrySettingsPage /></ProtectedRoute>} />
        <Route path="/party-ledger" element={<ProtectedRoute module="party_ledger"><PartyLedgerPage /></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute module="receipts"><ReceiptPage /></ProtectedRoute>} />

        {/* Workshop Routes */}
        <Route path="/workshop/job-card" element={<ProtectedRoute module="job_cards"><JobCardPage /></ProtectedRoute>} />
        <Route path="/print/job-card/:id" element={<ProtectedRoute module="job_cards"><JobCardPrintPage /></ProtectedRoute>} />
        <Route path="/workshop/inventory" element={<ProtectedRoute module="workshop_inventory"><WorkshopInventoryPage /></ProtectedRoute>} />
        <Route path="/workshop/purchases" element={<ProtectedRoute module="workshop_purchases"><WorkshopPurchasesPage /></ProtectedRoute>} />
        <Route path="/workshop/wp-return" element={<ProtectedRoute module="wp_return"><WpReturnPage /></ProtectedRoute>} />
        <Route path="/workshop/ws-return" element={<ProtectedRoute module="ws_return"><WsReturnPage /></ProtectedRoute>} />
        <Route path="/workshop/follow-up" element={<ProtectedRoute module="workshop_follow_up"><FollowUpPage /></ProtectedRoute>} />

        {/* Settings & Profile */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} /> {/* Added specific route for admin dashboard */}
        <Route path="/admin/users" element={<ProtectedRoute adminOnly={true}><UserManagementPage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<PlaceholderPage title="404 - Not Found" message="The page you are looking for does not exist." />} />
      </Routes>
  );
};

export default AppRoutes;