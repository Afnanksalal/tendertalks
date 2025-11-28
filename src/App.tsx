import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeatureGuard } from './components/FeatureGuard';
import { Loader2 } from 'lucide-react';

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
import { MaintenancePage } from './pages/Maintenance';

// Legal Pages
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicy';
import { TermsOfServicePage } from './pages/legal/TermsOfService';
import { RefundPolicyPage } from './pages/legal/RefundPolicy';

// Admin pages
import { AdminLayout, AdminOverview } from './pages/admin/AdminDashboard';
import { PodcastManager } from './pages/admin/PodcastManager';
import { PodcastEditor } from './pages/admin/PodcastEditor';
import { BlogManager } from './pages/admin/BlogManager';
import { UsersManager } from './pages/admin/UsersManager';
import { PaymentsManager } from './pages/admin/PaymentsManager';
import { RefundsManager } from './pages/admin/RefundsManager';
import ProductsManager from './pages/admin/ProductsManager';
import PlansManager from './pages/admin/PlansManager';
import SettingsManager from './pages/admin/SettingsManager';
import SubscriptionsManager from './pages/admin/SubscriptionsManager';
import InvoicesManager from './pages/admin/InvoicesManager';

// Blog pages
import { BlogPage } from './pages/Blog';

// Lazy loaded components (heavy dependencies)
const BlogEditor = lazy(() => import('./pages/admin/BlogEditor').then(m => ({ default: m.BlogEditor })));
const BlogDetailPage = lazy(() => import('./pages/BlogDetail').then(m => ({ default: m.BlogDetailPage })));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-[#030014] flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
  </div>
);

// Inner app content - separated to avoid hooks issues
const AppContent: React.FC = () => {
  const { isAdmin, isLoading: authLoading } = useAuthStore();
  const { settings, isLoaded: settingsLoaded } = useSettingsStore();

  // Show loading while checking auth and settings
  if (authLoading || !settingsLoaded) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  // Show maintenance page for non-admin users when maintenance mode is enabled
  if (settings.maintenance_mode && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white">
      <CustomCursor />
      <Navbar />
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/podcast/:slug" element={<PodcastDetailPage />} />
        <Route path="/pricing" element={<FeatureGuard feature="feature_subscriptions"><PricingPage /></FeatureGuard>} />
        <Route path="/store" element={<FeatureGuard feature="feature_merch"><StorePage /></FeatureGuard>} />
        <Route path="/blog" element={<FeatureGuard feature="feature_blog"><BlogPage /></FeatureGuard>} />
        <Route path="/blog/:slug" element={<FeatureGuard feature="feature_blog"><Suspense fallback={<PageLoader />}><BlogDetailPage /></Suspense></FeatureGuard>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/billing" element={<FeatureGuard feature="feature_subscriptions"><BillingPage /></FeatureGuard>} />
        <Route path="/downloads" element={<FeatureGuard feature="feature_downloads"><DownloadsPage /></FeatureGuard>} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="podcasts" element={<PodcastManager />} />
          <Route path="podcasts/new" element={<PodcastEditor />} />
          <Route path="podcasts/:id/edit" element={<PodcastEditor />} />
          <Route path="blogs" element={<BlogManager />} />
          <Route path="blogs/new" element={<Suspense fallback={<PageLoader />}><BlogEditor /></Suspense>} />
          <Route path="blogs/:id/edit" element={<Suspense fallback={<PageLoader />}><BlogEditor /></Suspense>} />
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
    </div>
  );
};

function App() {
  const { initialize } = useAuthStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    // Remove initial loader once React mounts
    const loader = document.querySelector('.initial-loader');
    if (loader) {
      loader.remove();
    }
    
    // Initialize auth and fetch settings
    initialize();
    fetchSettings();

    // Prevent page reload on visibility change (mobile tab switching)
    let wasHidden = false;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
      } else if (document.visibilityState === 'visible' && wasHidden) {
        wasHidden = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialize, fetchSettings]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
        <Analytics />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
