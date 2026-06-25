import React, { Suspense, lazy } from 'react';
const CustomerPortal = lazy(() => import('./components/CustomerPortal'));
const AIUsageDashboard = lazy(() => import('./components/AIUsageDashboard'));
const DownloadApp = lazy(() => import('./components/DownloadApp'));
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, LoginScreen, PendingApprovalScreen, useAuth } from './components/Auth.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

import Layout from './components/Layout.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { UserRole } from './lib/constants';
import { hasPermission, Permission } from './lib/permissions';

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard.tsx'));
const LeadList = lazy(() => import('./components/LeadList.tsx'));
const Prospecting = lazy(() => import('./components/Prospecting.tsx'));
const Signals = lazy(() => import('./components/Signals.tsx'));
const QuoteList = lazy(() => import('./components/QuoteList.tsx'));
const ShipmentKanban = lazy(() => import('./components/ShipmentKanban.tsx'));
const BuyerPipeline = lazy(() => import('./components/BuyerPipeline.tsx'));
const CompanyList = lazy(() => import('./components/CompanyList.tsx'));
const OrderList = lazy(() => import('./components/OrderList.tsx'));
const ShipmentExecution = lazy(() => import('./components/ShipmentExecution.tsx'));
const ShipmentTracker = lazy(() => import('./components/ShipmentTracker.tsx'));
const InventoryManager = lazy(() => import('./components/InventoryManager.tsx'));
const Procurement = lazy(() => import('./components/Procurement.tsx'));
const SupplierPortal = lazy(() => import('./components/SupplierPortal.tsx'));
const MarketOracle = lazy(() => import('./components/MarketOracle.tsx'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard.tsx'));
const ReportList = lazy(() => import('./components/ReportList.tsx'));
const SmartScanner = lazy(() => import('./components/SmartScanner.tsx'));
const Settings = lazy(() => import('./components/Settings.tsx'));
const FinanceOS = lazy(() => import('./components/FinanceOS.tsx'));
const Payments = lazy(() => import('./components/Payments.tsx'));
const Exceptions = lazy(() => import('./components/Exceptions.tsx'));
const DocumentVault = lazy(() => import('./components/DocumentVault.tsx'));
const ExportDocumentManager = lazy(() => import('./components/ExportDocumentManager.tsx'));
const UserManagement = lazy(() => import('./components/UserManagement.tsx'));
const AuditTrail = lazy(() => import('./components/AuditTrail.tsx'));
const SystemHealth = lazy(() => import('./components/SystemHealth.tsx'));
const WorkflowManager = lazy(() => import('./components/WorkflowManager.tsx'));
const CalendarView = lazy(() => import('./components/CalendarView.tsx'));
const CollaborationSpace = lazy(() => import('./components/CollaborationSpace.tsx'));
const TaskList = lazy(() => import('./components/TaskList.tsx'));
const CommunicationsHub = lazy(() => import('./components/communications/CommunicationsHub.tsx'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 font-serif italic">Loading component...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children, permission }: { children: React.ReactNode, permission?: Permission }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (profile && profile.status === 'pending') {
    return <PendingApprovalScreen />;
  }

  if (permission && profile && !hasPermission(profile.role, permission)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-black text-zinc-900 mb-2">Access Denied</h1>
        <p className="text-zinc-500 max-w-sm mb-8">
          You do not have the required permissions to access this module. Please contact your administrator if you believe this is an error.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

import { ShieldAlert } from 'lucide-react';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="leads" element={<PrivateRoute permission="sales.read"><LeadList /></PrivateRoute>} />
                  <Route path="prospecting" element={<PrivateRoute permission="sales.read"><Prospecting /></PrivateRoute>} />
                  <Route path="signals" element={<PrivateRoute permission="sales.read"><Signals /></PrivateRoute>} />
                  <Route path="quotes" element={<PrivateRoute permission="sales.read"><QuoteList /></PrivateRoute>} />
                  <Route path="pipeline" element={<PrivateRoute permission="operations.read"><ShipmentKanban /></PrivateRoute>} />
                  <Route path="buyer-pipeline" element={<PrivateRoute permission="sales.read"><BuyerPipeline /></PrivateRoute>} />
                  <Route path="companies" element={<PrivateRoute permission="sales.read"><CompanyList /></PrivateRoute>} />
                  <Route path="orders" element={<PrivateRoute permission="operations.read"><OrderList /></PrivateRoute>} />
                  <Route path="execution" element={<PrivateRoute permission="operations.read"><ShipmentExecution /></PrivateRoute>} />
                  <Route path="shipment-tracker" element={<PrivateRoute permission="operations.read"><ShipmentTracker /></PrivateRoute>} />
                  <Route path="inventory" element={<PrivateRoute permission="operations.read"><InventoryManager /></PrivateRoute>} />
                  <Route path="procurement" element={<PrivateRoute permission="operations.read"><Procurement /></PrivateRoute>} />
                  <Route path="suppliers" element={<PrivateRoute permission="operations.read"><SupplierPortal /></PrivateRoute>} />
                  <Route path="market" element={<PrivateRoute permission="intelligence.read"><MarketOracle /></PrivateRoute>} />
                  <Route path="analytics" element={<PrivateRoute permission="intelligence.read"><AnalyticsDashboard /></PrivateRoute>} />
                  <Route path="reports" element={<PrivateRoute permission="intelligence.read"><ReportList /></PrivateRoute>} />
                  <Route path="scanner" element={<PrivateRoute permission="intelligence.read"><SmartScanner /></PrivateRoute>} />
                  <Route path="finance" element={<PrivateRoute permission="finance.read"><FinanceOS /></PrivateRoute>} />
                  <Route path="payments" element={<PrivateRoute permission="finance.read"><Payments /></PrivateRoute>} />
                  <Route path="exceptions" element={<PrivateRoute permission="operations.read"><Exceptions /></PrivateRoute>} />
                  <Route path="documents" element={<PrivateRoute permission="operations.read"><DocumentVault /></PrivateRoute>} />
                  <Route path="documents-manager" element={<PrivateRoute permission="operations.read"><ExportDocumentManager /></PrivateRoute>} />
                  <Route path="users" element={<PrivateRoute permission="users.read"><UserManagement /></PrivateRoute>} />
                  <Route path="audit" element={<PrivateRoute permission="audit.read"><AuditTrail /></PrivateRoute>} />
                  <Route path="health" element={<PrivateRoute permission="health.read"><SystemHealth /></PrivateRoute>} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="workflows" element={<PrivateRoute permission="communication.read"><WorkflowManager /></PrivateRoute>} />
                  <Route path="calendar" element={<PrivateRoute permission="communication.read"><CalendarView /></PrivateRoute>} />
                  <Route path="collaboration" element={<PrivateRoute permission="communication.read"><CollaborationSpace /></PrivateRoute>} />
                  <Route path="tasks" element={<PrivateRoute permission="communication.read"><TaskList /></PrivateRoute>} />
              <Route path="customer-portal" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><CustomerPortal /></Suspense></PrivateRoute>} />
              <Route path="ai-usage" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><AIUsageDashboard /></Suspense></PrivateRoute>} />
                  <Route path="communications" element={<PrivateRoute permission="communication.read"><CommunicationsHub /></PrivateRoute>} />
              <Route path="download-app" element={<Suspense fallback={<Loader2 className="animate-spin" />}><DownloadApp /></Suspense>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </Router>
          </ErrorBoundary>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
