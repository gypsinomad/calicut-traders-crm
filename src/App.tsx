import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Stub placeholder for all modules not yet implemented
const ComingSoon = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>{name}</h2>
    <p>This module is coming soon.</p>
  </div>
);


const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster richColors position="top-right" />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<ComingSoon name="Login" />} />
            <Route path="/dashboard" element={<ComingSoon name="Dashboard" />} />
            <Route path="/leads" element={<ComingSoon name="Leads" />} />
            <Route path="/prospecting" element={<ComingSoon name="Prospecting" />} />
            <Route path="/signals" element={<ComingSoon name="Signals" />} />
            <Route path="/quotes" element={<ComingSoon name="Quotes" />} />
            <Route path="/orders" element={<ComingSoon name="Orders" />} />
            <Route path="/shipments" element={<ComingSoon name="Shipments" />} />
            <Route path="/shipment-kanban" element={<ComingSoon name="Shipment Kanban" />} />
            <Route path="/shipment-tracker" element={<ComingSoon name="Shipment Tracker" />} />
            <Route path="/buyer-pipeline" element={<ComingSoon name="Buyer Pipeline" />} />
            <Route path="/companies" element={<ComingSoon name="Companies" />} />
            <Route path="/inventory" element={<ComingSoon name="Inventory" />} />
            <Route path="/procurement" element={<ComingSoon name="Procurement" />} />
            <Route path="/supplier-portal" element={<ComingSoon name="Supplier Portal" />} />
            <Route path="/market-oracle" element={<ComingSoon name="Market Oracle" />} />
            <Route path="/analytics" element={<ComingSoon name="Analytics" />} />
            <Route path="/reports" element={<ComingSoon name="Reports" />} />
            <Route path="/smart-scanner" element={<ComingSoon name="Smart Scanner" />} />
            <Route path="/settings" element={<ComingSoon name="Settings" />} />
            <Route path="/finance" element={<ComingSoon name="Finance OS" />} />
            <Route path="/payments" element={<ComingSoon name="Payments" />} />
            <Route path="/exceptions" element={<ComingSoon name="Exceptions" />} />
            <Route path="/documents" element={<ComingSoon name="Documents" />} />
            <Route path="/export-docs" element={<ComingSoon name="Export Documents" />} />
            <Route path="/users" element={<ComingSoon name="User Management" />} />
            <Route path="/audit" element={<ComingSoon name="Audit Trail" />} />
            <Route path="/system-health" element={<ComingSoon name="System Health" />} />
            <Route path="/workflows" element={<ComingSoon name="Workflow Manager" />} />
            <Route path="/calendar" element={<ComingSoon name="Calendar" />} />
            <Route path="/collaboration" element={<ComingSoon name="Collaboration Space" />} />
            <Route path="/tasks" element={<ComingSoon name="Task List" />} />
            <Route path="/communications" element={<ComingSoon name="Communications Hub" />} />
            <Route path="/customer-portal" element={<ComingSoon name="Customer Portal" />} />
            <Route path="/ai-usage" element={<ComingSoon name="AI Usage Dashboard" />} />
            <Route path="/download" element={<ComingSoon name="Download App" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
