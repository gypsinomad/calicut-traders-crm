import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, LoginScreen, PendingApprovalScreen, useAuth } from './components/Auth';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Toaster } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { UserRole } from './lib/constants';
import { hasPermission, Permission } from './lib/permissions';

const Dashboard = lazy(() => import('./components/Dashboard'));
const LeadList = lazy(() => import('./components/LeadList'));
const Prospecting = lazy(() => import('./components/Prospecting'));
const Signals = lazy(() => import('./components/Signals'));
const QuoteList = lazy(() => import('./components/QuoteList'));
const ShipmentKanban = lazy(() => import('./components/ShipmentKanban'));
const BuyerPipeline = lazy(() => import('./components/BuyerPipeline'));
const CompanyList = lazy(() => import('./components/CompanyList'));
const OrderList = lazy(() => import('./components/OrderList'));
const ShipmentExecution = lazy(() => import('./components/ShipmentExecution'));
const ShipmentTracker = lazy(() => import('./components/ShipmentTracker'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const Procurement = lazy(() => import('./components/Procurement'));
const SupplierPortal = lazy(() => import('./components/SupplierPortal'));
const MarketOracle = lazy(() => import('./components/MarketOracle'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const ReportList = lazy(() => import('./components/ReportList'));
const SmartScanner = lazy(() => import('./components/SmartScanner'));
const Settings = lazy(() => import('./components/Settings'));
const FinanceOS = lazy(() => import('./components/FinanceOS'));
const Payments = lazy(() => import('./components/Payments'));
const Exceptions = lazy(() => import('./components/Exceptions'));
const DocumentVault = lazy(() => import('./components/DocumentVault'));
const ExportDocumentManager = lazy(() => import('./components/ExportDocumentManager'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const AuditTrail = lazy(() => import('./components/AuditTrail'));
const SystemHealth = lazy(() => import('./components/SystemHealth'));
const WorkflowManager = lazy(() => import('./components/WorkflowManager'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const CollaborationSpace = lazy(() => import('./components/CollaborationSpace'));
const TaskList = lazy(() => import('./components/TaskList'));
const CommunicationsHub = lazy(() => import('./components/communications/CommunicationsHub'));
const CustomerPortal = lazy(() => import('./components/CustomerPortal'));
const AIUsageDashboard = lazy(() => import('./components/AIUsageDashboard'));
const DownloadApp = lazy(() => import('./components/DownloadApp'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 font-medium text-sm">Loading...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children, permission }: { children: React.ReactNode; permission?: Permission }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (profile && profile.status === 'pending') {
    return <PendingApprovalScreen />;
  }

  if (permission && profile && !hasPermission(profile.role as UserRole, permission)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-20 h-20 bg-rose-900/20 rounded-full flex items-center justify-center">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-black text-white mt-4">Access Denied</h1>
        <p className="text-zinc-500 max-w-md text-center mt-2">You do not have the required permissions.</p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-zinc-900 text-white rounded-xl mt-6"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

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
                    <Route path="leads" element={<LeadList />} />
                    <Route path="prospecting" element={<Prospecting />} />
                    <Route path="signals" element={<Signals />} />
                    <Route path="quotes" element={<QuoteList />} />
                    <Route path="pipeline" element={<ShipmentKanban />} />
                    <Route path="buyer-pipeline" element={<BuyerPipeline />} />
                    <Route path="companies" element={<CompanyList />} />
                    <Route path="orders" element={<OrderList />} />
                    <Route path="execution" element={<ShipmentExecution />} />
                    <Route path="shipment-tracker" element={<ShipmentTracker />} />
                    <Route path="inventory" element={<InventoryManager />} />
                    <Route path="procurement" element={<Procurement />} />
                    <Route path="suppliers" element={<SupplierPortal />} />
                    <Route path="market" element={<MarketOracle />} />
                    <Route path="analytics" element={<AnalyticsDashboard />} />
                    <Route path="reports" element={<ReportList />} />
                    <Route path="scanner" element={<SmartScanner />} />
                    <Route path="finance" element={<FinanceOS />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="exceptions" element={<Exceptions />} />
                    <Route path="documents" element={<DocumentVault />} />
                    <Route path="documents-mgr" element={<ExportDocumentManager />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="audit" element={<AuditTrail />} />
                    <Route path="health" element={<SystemHealth />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="workflows" element={<WorkflowManager />} />
                    <Route path="calendar" element={<CalendarView />} />
                    <Route path="collaboration" element={<CollaborationSpace />} />
                    <Route path="tasks" element={<TaskList />} />
                    <Route path="customer-portal" element={<CustomerPortal />} />
                    <Route path="ai-usage" element={<AIUsageDashboard />} />
                    <Route path="communications" element={<CommunicationsHub />} />
                    <Route path="download-app" element={<DownloadApp />} />
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
