import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layout
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CustomCursor } from './components/CustomCursor';
import { CartDrawer } from './components/cart/CartDrawer';

// Pages
import { HomePage } from './pages/Home';
import { BrowsePage } from './pages/Browse';
import { PodcastDetailPage } from './pages/PodcastDetail';
import { PricingPage } from './pages/Pricing';
import { DashboardPage } from './pages/Dashboard';
import { StorePage } from './pages/Store';
import { SettingsPage } from './pages/Settings';
import { DownloadsPage } from './pages/Downloads';
import { AuthCallback } from './pages/AuthCallback';

// Legal Pages
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicy';
import { TermsOfServicePage } from './pages/legal/TermsOfService';
import { RefundPolicyPage } from './pages/legal/RefundPolicy';

// Admin pages
import { AdminLayout, AdminOverview } from './pages/admin/AdminDashboard';
import { PodcastManager } from './pages/admin/PodcastManager';
import { PodcastEditor } from './pages/admin/PodcastEditor';
import { UsersManager } from './pages/admin/UsersManager';
import { PaymentsManager } from './pages/admin/PaymentsManager';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-[#030014] text-white">
          <CustomCursor />
          <Navbar />
          
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/podcast/:slug" element={<PodcastDetailPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="podcasts" element={<PodcastManager />} />
              <Route path="podcasts/new" element={<PodcastEditor />} />
              <Route path="podcasts/:id/edit" element={<PodcastEditor />} />
              <Route path="users" element={<UsersManager />} />
              <Route path="payments" element={<PaymentsManager />} />
            </Route>
          </Routes>

          <Footer />
          <CartDrawer />
          
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
              },
              success: { iconTheme: { primary: '#00FF94', secondary: '#1e293b' } },
              error: { iconTheme: { primary: '#FF0055', secondary: '#1e293b' } },
            }}
          />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
