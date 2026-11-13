import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LegalPage } from './pages/LegalPage';
import { AuthModal } from './components/AuthModal';
import { ProductAlbumModal } from './components/ProductAlbumModal';
import { AlbumPage } from './pages/AlbumPage';
import { useAuth } from './context/AuthContext';
import { useStore } from './context/StoreContext';
import { Product, Order } from './types';

type AppPage =
  | 'home'
  | 'shop'
  | 'album'
  | 'product'
  | 'checkout'
  | 'order-confirmation'
  | 'account'
  | 'legal'
  | 'admin'
  | 'admin-login';

const PAGE_TO_PATH: Record<AppPage, string> = {
  home: '/',
  shop: '/shop',
  album: '/album',
  product: '/product',
  checkout: '/checkout',
  'order-confirmation': '/order-confirmation',
  account: '/account',
  legal: '/legal',
  admin: '/admin',
  'admin-login': '/admin/login',
};

function resolvePageFromPathname(pathname: string): AppPage {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/admin/login') return 'admin-login';
  if (clean === '/admin' || clean.startsWith('/admin/')) return 'admin';
  if (clean === '/shop') return 'shop';
  if (clean === '/album') return 'album';
  if (clean === '/product') return 'product';
  if (clean === '/checkout') return 'checkout';
  if (clean === '/order-confirmation') return 'order-confirmation';
  if (clean === '/account') return 'account';
  if (clean === '/legal') return 'legal';
  return 'home';
}

export function AppContent() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, isAdmin } = useAuth();
  const { products } = useStore();
  const [currentPage, setCurrentPage] = useState<AppPage>(() =>
    resolvePageFromPathname(window.location.pathname)
  );
  const [pageParams, setPageParams] = useState<any>({});
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [albumModalProduct, setAlbumModalProduct] = useState<Product | null>(null);
  const [albumModalIndex, setAlbumModalIndex] = useState<number>(0);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const navigateTo = (page: string, params: any = {}, replace = false) => {
    const targetPage = (page in PAGE_TO_PATH ? page : 'home') as AppPage;
    const targetPath = PAGE_TO_PATH[targetPage] || '/';
    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({}, '', targetPath);
      } else {
        window.history.pushState({}, '', targetPath);
      }
    }
    setCurrentPage(targetPage);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync browser Back/Forward buttons with URL path routing
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(resolvePageFromPathname(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guard Admin Routes: /admin requires admin authentication, /admin/login redirects to /admin if authenticated
  useEffect(() => {
    if (currentPage === 'admin' && !isAdmin) {
      window.history.replaceState({}, '', '/admin/login');
      setCurrentPage('admin-login');
    } else if (currentPage === 'admin-login' && isAdmin) {
      window.history.replaceState({}, '', '/admin');
      setCurrentPage('admin');
    }
  }, [currentPage, isAdmin]);

  const handleSelectProduct = (product: Product) => {
    navigateTo('product', { product });
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  const handleOrderSuccess = (order: Order) => {
    setConfirmedOrder(order);
    navigateTo('order-confirmation');
  };

  const handleOpenAlbumModal = (product: Product, initialIndex = 0) => {
    setAlbumModalProduct(product);
    setAlbumModalIndex(initialIndex);
  };

  // Dedicated Admin Routes (Completely isolated from Public Storefront shell)
  if (currentPage === 'admin-login' || (currentPage === 'admin' && !isAdmin)) {
    return (
      <AdminLoginPage
        onLoginSuccess={() => navigateTo('admin', {}, true)}
        onReturnToStore={() => navigateTo('home')}
      />
    );
  }

  if (currentPage === 'admin' && isAdmin) {
    return (
      <AdminDashboard
        onReturnToStore={() => navigateTo('home')}
        onLogout={() => navigateTo('admin-login', {}, true)}
      />
    );
  }

  // Public Storefront Routes
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-page)] text-[var(--text-body)]">
      {/* Main Boutique Header */}
      <Header onNavigate={navigateTo} currentPage={currentPage} currentParams={pageParams} />

      {/* Active Public Page View */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage
            onNavigate={navigateTo}
            onQuickView={handleQuickView}
            onSelectProduct={handleSelectProduct}
            onOpenAlbumModal={handleOpenAlbumModal}
          />
        )}

        {currentPage === 'shop' && (
          <ShopPage
            initialFilter={pageParams?.filter}
            initialCategory={pageParams?.category}
            initialSearch={pageParams?.search}
            initialAgeGroup={pageParams?.ageGroup}
            onQuickView={handleQuickView}
            onSelectProduct={handleSelectProduct}
            onOpenAlbumModal={handleOpenAlbumModal}
            onNavigate={navigateTo}
          />
        )}

        {currentPage === 'album' && (
          <AlbumPage
            onSelectProduct={handleSelectProduct}
            onOpenAlbumModal={handleOpenAlbumModal}
            onQuickView={handleQuickView}
          />
        )}

        {currentPage === 'product' && pageParams?.product && (
          <ProductDetailPage
            product={pageParams.product}
            onNavigateCheckout={() => navigateTo('checkout')}
            onSelectProduct={handleSelectProduct}
            onQuickView={handleQuickView}
          />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPage
            onOrderSuccess={handleOrderSuccess}
            onBackToCart={() => navigateTo('home')}
          />
        )}

        {currentPage === 'order-confirmation' && confirmedOrder && (
          <OrderConfirmationPage
            order={confirmedOrder}
            onReturnToStore={() => navigateTo('home')}
            onTrackOrder={() => navigateTo('account', { tab: 'orders' })}
          />
        )}

        {currentPage === 'account' && (
          <AccountPage
            initialTab={pageParams?.tab || 'orders'}
            onQuickView={handleQuickView}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentPage === 'legal' && (
          <LegalPage
            initialSection={pageParams?.section || 'shipping'}
            onReturnToStore={() => navigateTo('home')}
          />
        )}
      </main>

      {/* Main Boutique Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Global Slide-Over Cart Drawer */}
      <CartDrawer
        onNavigateCheckout={() => navigateTo('checkout')}
        onContinueShopping={() => navigateTo('shop')}
      />

      {/* Global Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onViewDetails={handleSelectProduct}
        />
      )}

      {/* Global Product Image Album Modal */}
      {albumModalProduct && (
        <ProductAlbumModal
          isOpen={Boolean(albumModalProduct)}
          onClose={() => setAlbumModalProduct(null)}
          product={albumModalProduct}
          allProducts={products}
          onSelectProduct={handleSelectProduct}
          initialImageIndex={albumModalIndex}
        />
      )}

      {/* Global Public Customer Authentication Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          defaultMode={authModalMode}
          onNavigate={navigateTo}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <StoreProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
