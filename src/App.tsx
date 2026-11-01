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
import { LegalPage } from './pages/LegalPage';
import { AuthModal } from './components/AuthModal';
import { ProductAlbumModal } from './components/ProductAlbumModal';
import { AlbumPage } from './pages/AlbumPage';
import { useAuth } from './context/AuthContext';
import { useStore } from './context/StoreContext';
import { Product, Order } from './types';

export function AppContent() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, currentUser } = useAuth();
  const { products } = useStore();
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [pageParams, setPageParams] = useState<any>({});
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [albumModalProduct, setAlbumModalProduct] = useState<Product | null>(null);
  const [albumModalIndex, setAlbumModalIndex] = useState<number>(0);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const navigateTo = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Automatically redirect administrator to the admin dashboard after authentication
  const prevUserRef = React.useRef<typeof currentUser>(currentUser);
  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = currentUser;

    const wasNotAdmin = !prev || prev.isGuest || prev.role !== 'admin';
    const isNowAdmin = currentUser && !currentUser.isGuest && currentUser.role === 'admin';

    if (wasNotAdmin && isNowAdmin) {
      navigateTo('admin');
    }
  }, [currentUser]);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#FBE7E3] text-[#340404]">
      {/* If inside Admin view, render full-screen Admin Dashboard without store header/footer */}
      {currentPage === 'admin' ? (
        <AdminDashboard onReturnToStore={() => navigateTo('home')} />
      ) : (
        <>
          {/* Main Boutique Header */}
          <Header onNavigate={navigateTo} currentPage={currentPage} currentParams={pageParams} />

          {/* Active Page View */}
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
                onNavigateAdmin={() => navigateTo('admin')}
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

          {/* Global Authentication Modal */}
          {isAuthModalOpen && (
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={closeAuthModal}
              defaultMode={authModalMode}
              onNavigate={navigateTo}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </LanguageProvider>
  );
}
