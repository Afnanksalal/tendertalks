import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
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
import { BillingPage } from './pages/Billing';
import { AuthCallback } from './pages/AuthCallback';
import { NotFoundPage } from './pages/NotFound';

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
import { RefundsManager } from './pages/admin/RefundsManager';
import ProductsManager from './pages/admin/ProductsManager';
import PlansManager from './pages/admin/PlansManager';
import SettingsManager from './pages/admin/SettingsManager';
import SubscriptionsManager from './pages/admin/SubscriptionsManager';
import InvoicesManager from './pages/admin/InvoicesManager';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Remove initial loader once React mounts
    const loader = document.querySelector('.initial-loader');
    if (loader) {
      loader.remove();
    }
    
    // Initialize auth only once on mount
    initialize();

    // Prevent page reload on visibility change (mobile tab switching)
    let wasHidden = false;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
      } else if (document.visibilityState === 'visible' && wasHidden) {
        wasHidden = false;
        // Don't re-initialize auth on visibility change - just refresh token if needed
        // This prevents the page from reloading when switching back to the tab
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Prevent iOS Safari from reloading on back/forward navigation
    window.addEventListener('pageshow', (event) => {
      // Page was restored from bfcache - no action needed
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="podcasts" element={<PodcastManager />} />
              <Route path="podcasts/new" element={<PodcastEditor />} />
              <Route path="podcasts/:id/edit" element={<PodcastEditor />} />
              <Route path="users" element={<UsersManager />} />
              <Route path="payments" element={<PaymentsManager />} />
              <Route path="invoices" element={<InvoicesManager />} />
              <Route path="refunds" element={<RefundsManager />} />
              <Route path="products" element={<ProductsManager />} />
              <Route path="plans" element={<PlansManager />} />
              <Route path="subscriptions" element={<SubscriptionsManager />} />
              <Route path="settings" element={<SettingsManager />} />
            </Route>

            {/* 404 Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
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
          <Analytics />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
