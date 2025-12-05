import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeatureGuard } from './components/FeatureGuard';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import { PlaylistsPage } from './pages/Playlists';
import { PlaylistDetailPage } from './pages/PlaylistDetail';
import { AuthCallback } from './pages/AuthCallback';
import { NotFoundPage } from './pages/NotFound';
import { MaintenancePage } from './pages/Maintenance';

// Legal Pages
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicy';
import { TermsOfServicePage } from './pages/legal/TermsOfService';
import { RefundPolicyPage } from './pages/legal/RefundPolicy';

// Admin pages
// Admin pages (Lazy loaded)
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminLayout }))
);
const AdminOverview = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminOverview }))
);
const PodcastManager = lazy(() =>
  import('./pages/admin/PodcastManager').then((m) => ({ default: m.PodcastManager }))
);
const PodcastEditor = lazy(() =>
  import('./pages/admin/PodcastEditor').then((m) => ({ default: m.PodcastEditor }))
);
const PlaylistManager = lazy(() =>
  import('./pages/admin/PlaylistManager').then((m) => ({ default: m.PlaylistManager }))
);
const PlaylistEditor = lazy(() =>
  import('./pages/admin/PlaylistEditor').then((m) => ({ default: m.PlaylistEditor }))
);
const BlogManager = lazy(() =>
  import('./pages/admin/BlogManager').then((m) => ({ default: m.BlogManager }))
);
const UsersManager = lazy(() =>
  import('./pages/admin/UsersManager').then((m) => ({ default: m.UsersManager }))
);
const PaymentsManager = lazy(() =>
  import('./pages/admin/PaymentsManager').then((m) => ({ default: m.PaymentsManager }))
);
const RefundsManager = lazy(() =>
  import('./pages/admin/RefundsManager').then((m) => ({ default: m.RefundsManager }))
);
const ProductsManager = lazy(() => import('./pages/admin/ProductsManager'));
const PlansManager = lazy(() => import('./pages/admin/PlansManager'));
const SettingsManager = lazy(() => import('./pages/admin/SettingsManager'));
const SubscriptionsManager = lazy(() => import('./pages/admin/SubscriptionsManager'));
const InvoicesManager = lazy(() => import('./pages/admin/InvoicesManager'));

// Heavy user pages (Lazy loaded)
const SettingsPage = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.SettingsPage }))
);
const DownloadsPage = lazy(() =>
  import('./pages/Downloads').then((m) => ({ default: m.DownloadsPage }))
);
const BillingPage = lazy(() => import('./pages/Billing').then((m) => ({ default: m.BillingPage })));

// Blog pages
import { BlogPage } from './pages/Blog';

// Lazy loaded components (heavy dependencies)
const BlogEditor = lazy(() =>
  import('./pages/admin/BlogEditor').then((m) => ({ default: m.BlogEditor }))
);
const BlogDetailPage = lazy(() =>
  import('./pages/BlogDetail').then((m) => ({ default: m.BlogDetailPage }))
);

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
        <Route path="/playlists" element={<PlaylistsPage />} />
        <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        <Route
          path="/pricing"
          element={
            <FeatureGuard feature="feature_subscriptions">
              <PricingPage />
            </FeatureGuard>
          }
        />
        <Route
          path="/store"
          element={
            <FeatureGuard feature="feature_merch">
              <StorePage />
            </FeatureGuard>
          }
        />
        <Route
          path="/blog"
          element={
            <FeatureGuard feature="feature_blog">
              <BlogPage />
            </FeatureGuard>
          }
        />
        <Route
          path="/blog/:slug"
          element={
            <FeatureGuard feature="feature_blog">
              <Suspense fallback={<PageLoader />}>
                <BlogDetailPage />
              </Suspense>
            </FeatureGuard>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <FeatureGuard feature="feature_subscriptions">
                <Suspense fallback={<PageLoader />}>
                  <BillingPage />
                </Suspense>
              </FeatureGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/downloads"
          element={
            <ProtectedRoute>
              <FeatureGuard feature="feature_downloads">
                <Suspense fallback={<PageLoader />}>
                  <DownloadsPage />
                </Suspense>
              </FeatureGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminOverview />
              </Suspense>
            }
          />
          <Route
            path="podcasts"
            element={
              <Suspense fallback={<PageLoader />}>
                <PodcastManager />
              </Suspense>
            }
          />
          <Route
            path="podcasts/new"
            element={
              <Suspense fallback={<PageLoader />}>
                <PodcastEditor />
              </Suspense>
            }
          />
          <Route
            path="podcasts/:id/edit"
            element={
              <Suspense fallback={<PageLoader />}>
                <PodcastEditor />
              </Suspense>
            }
          />
          <Route
            path="playlists"
            element={
              <Suspense fallback={<PageLoader />}>
                <PlaylistManager />
              </Suspense>
            }
          />
          <Route
            path="playlists/new"
            element={
              <Suspense fallback={<PageLoader />}>
                <PlaylistEditor />
              </Suspense>
            }
          />
          <Route
            path="playlists/:id/edit"
            element={
              <Suspense fallback={<PageLoader />}>
                <PlaylistEditor />
              </Suspense>
            }
          />
          <Route
            path="blogs"
            element={
              <Suspense fallback={<PageLoader />}>
                <BlogManager />
              </Suspense>
            }
          />
          <Route
            path="blogs/new"
            element={
              <Suspense fallback={<PageLoader />}>
                <BlogEditor />
              </Suspense>
            }
          />
          <Route
            path="blogs/:id/edit"
            element={
              <Suspense fallback={<PageLoader />}>
                <BlogEditor />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageLoader />}>
                <UsersManager />
              </Suspense>
            }
          />
          <Route
            path="payments"
            element={
              <Suspense fallback={<PageLoader />}>
                <PaymentsManager />
              </Suspense>
            }
          />
          <Route
            path="invoices"
            element={
              <Suspense fallback={<PageLoader />}>
                <InvoicesManager />
              </Suspense>
            }
          />
          <Route
            path="refunds"
            element={
              <Suspense fallback={<PageLoader />}>
                <RefundsManager />
              </Suspense>
            }
          />
          <Route
            path="products"
            element={
              <Suspense fallback={<PageLoader />}>
                <ProductsManager />
              </Suspense>
            }
          />
          <Route
            path="plans"
            element={
              <Suspense fallback={<PageLoader />}>
                <PlansManager />
              </Suspense>
            }
          />
          <Route
            path="subscriptions"
            element={
              <Suspense fallback={<PageLoader />}>
                <SubscriptionsManager />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SettingsManager />
              </Suspense>
            }
          />
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
