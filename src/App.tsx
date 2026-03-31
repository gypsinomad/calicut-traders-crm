import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route,
  Navigate
} from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import OrderList from './components/OrderList.tsx';
import CompanyList from './components/CompanyList.tsx';
import TaskList from './components/TaskList.tsx';
import AuditTrail from './components/AuditTrail.tsx';
import SystemHealth from './components/SystemHealth.tsx';
import Analytics from './components/Analytics.tsx';
import Payments from './components/Payments.tsx';
import Exceptions from './components/Exceptions.tsx';
import DocumentVault from './components/DocumentVault.tsx';
import ShipmentExecution from './components/ShipmentExecution.tsx';
import ReportList from './components/ReportList.tsx';
import Settings from './components/Settings.tsx';
import InventoryManager from './components/InventoryManager.tsx';
import MarketOracle from './components/MarketOracle.tsx';
import SupplierPortal from './components/SupplierPortal.tsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.tsx';
import SmartScanner from './components/SmartScanner.tsx';
import ComplianceAssistant from './components/ComplianceAssistant.tsx';
import ShipmentKanban from './components/ShipmentKanban.tsx';
import OnboardingWizard from './components/OnboardingWizard.tsx';
import CommandPalette from './components/CommandPalette.tsx';
import QuoteList from './components/QuoteList.tsx';
import CustomerPortal from './components/CustomerPortal.tsx';
import CalendarView from './components/CalendarView.tsx';
import CollaborationSpace from './components/CollaborationSpace.tsx';
import ExportDocumentManager from './components/ExportDocumentManager.tsx';
import BuyerPipeline from './components/BuyerPipeline.tsx';
import ShipmentTracker from './components/ShipmentTracker.tsx';
import UserManagement from './components/UserManagement.tsx';
import CommunicationsHub from './components/communications/CommunicationsHub.tsx';
import { AuthProvider, useAuth, LoginScreen, PendingApprovalScreen } from './components/Auth.tsx';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { automationService } from './services/automationService';
import { initPresence } from './services/presenceService';

import { Toaster } from 'sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      if (!user || !profile || profile.status !== 'active') {
        setCheckingOnboarding(false);
        return;
      }

      try {
        // 1. Check user profile first (fastest)
        if (profile.onboardingCompleted) {
          setShowOnboarding(false);
          setCheckingOnboarding(false);
          return;
        }

        // 2. Check organization document
        const orgId = profile.organization;
        if (orgId) {
          const orgRef = doc(db, 'organizations', orgId);
          const orgSnap = await getDoc(orgRef);
          
          if (orgSnap.exists() && orgSnap.data().onboardingCompleted) {
            // Sync user profile if org is completed but user profile isn't
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { onboardingCompleted: true });
            setShowOnboarding(false);
          } else {
            setShowOnboarding(true);
          }
        } else {
          // No org assigned yet, show onboarding
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    if (!loading) {
      checkOnboarding();
    }
  }, [user, profile, loading]);

  if (loading || (user && checkingOnboarding)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-900" size={40} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (profile && profile.status !== 'active') {
    return <PendingApprovalScreen />;
  }

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard onComplete={() => {
          setShowOnboarding(false);
        }} />
      )}
      <CommandPalette />
      <Toaster position="top-right" />
      {children}
    </>
  );
}

import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';

function AppContent() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile && profile.status === 'active') {
      const cleanup = initPresence(user.uid);
      return cleanup;
    }
  }, [user, profile]);

  useEffect(() => {
    // Run periodic checks every 5 minutes
    const interval = setInterval(() => {
      automationService.runPeriodicChecks().catch(console.error);
    }, 5 * 60 * 1000);

    // Run once on mount
    automationService.runPeriodicChecks().catch(console.error);

    return () => clearInterval(interval);
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<LeadList />} />
            <Route path="quotes" element={<QuoteList />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="pipeline" element={<ShipmentKanban />} />
            <Route path="execution" element={<ShipmentExecution />} />
            <Route path="documents" element={<DocumentVault />} />
            <Route path="tasks" element={<TaskList />} />
            <Route path="companies" element={<CompanyList />} />
            <Route path="reports" element={<ReportList />} />
            <Route path="documents-manager" element={<ExportDocumentManager />} />
            <Route path="buyer-pipeline" element={<BuyerPipeline />} />
            <Route path="shipment-tracker" element={<ShipmentTracker />} />
            <Route path="communications" element={<CommunicationsHub />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="collaboration" element={<CollaborationSpace />} />
            <Route path="inventory" element={<InventoryManager />} />
            <Route path="market" element={<MarketOracle />} />
            <Route path="suppliers" element={<SupplierPortal />} />
            <Route path="payments" element={<Payments />} />
            <Route path="exceptions" element={<Exceptions />} />
            <Route path="portal" element={<CustomerPortal />} />
            <Route path="audit" element={<AuditTrail />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="scanner" element={<SmartScanner />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <ComplianceAssistant />
      </Router>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
