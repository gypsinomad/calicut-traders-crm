import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, LoginScreen, PendingApprovalScreen, useAuth } from './components/Auth.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { Toaster } from 'sonner';

import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import Prospecting from './components/Prospecting.tsx';
import Signals from './components/Signals.tsx';
import QuoteList from './components/QuoteList.tsx';
import ShipmentKanban from './components/ShipmentKanban.tsx';
import BuyerPipeline from './components/BuyerPipeline.tsx';
import CompanyList from './components/CompanyList.tsx';
import OrderList from './components/OrderList.tsx';
import ShipmentExecution from './components/ShipmentExecution.tsx';
import ShipmentTracker from './components/ShipmentTracker.tsx';
import InventoryManager from './components/InventoryManager.tsx';
import Procurement from './components/Procurement.tsx';
import SupplierPortal from './components/SupplierPortal.tsx';
import MarketOracle from './components/MarketOracle.tsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.tsx';
import ReportList from './components/ReportList.tsx';
import SmartScanner from './components/SmartScanner.tsx';
import Settings from './components/Settings.tsx';
import FinanceOS from './components/FinanceOS.tsx';
import Payments from './components/Payments.tsx';
import Exceptions from './components/Exceptions.tsx';
import DocumentVault from './components/DocumentVault.tsx';
import ExportDocumentManager from './components/ExportDocumentManager.tsx';
import UserManagement from './components/UserManagement.tsx';
import AuditTrail from './components/AuditTrail.tsx';
import SystemHealth from './components/SystemHealth.tsx';
import WorkflowManager from './components/WorkflowManager.tsx';
import CalendarView from './components/CalendarView.tsx';
import CollaborationSpace from './components/CollaborationSpace.tsx';
import TaskList from './components/TaskList.tsx';
import CommunicationsHub from './components/communications/CommunicationsHub.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

function PrivateRoute({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Router>
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
                <Route path="documents-manager" element={<ExportDocumentManager />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="audit" element={<AuditTrail />} />
                <Route path="health" element={<SystemHealth />} />
                <Route path="settings" element={<Settings />} />
                <Route path="workflows" element={<WorkflowManager />} />
                <Route path="calendar" element={<CalendarView />} />
                <Route path="collaboration" element={<CollaborationSpace />} />
                <Route path="tasks" element={<TaskList />} />
                <Route path="communications" element={<CommunicationsHub />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Router>
          </ErrorBoundary>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
