import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User,
  Home,
  ShoppingBag,
  Package,
  Heart,
  BookOpen,
  Flame,
  Tag,
  MessageCircle,
  Truck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { storeConfig } from '../config/storeConfig';
import { Language } from '../types';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  accountTriggerRef: React.RefObject<HTMLButtonElement | null>;
  focusTarget: 'close' | 'account';
  topOffset: number | null;
  onNavigate: (page: string, params?: any) => void;
  currentPage: string;
  currentParams?: any;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  triggerRef,
  accountTriggerRef,
  focusTarget,
  topOffset,
  onNavigate,
  currentPage,
  currentParams,
}) => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { currentUser, openAuthModal } = useAuth();
  const { categories } = useStore();

  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [isShopExpanded, setIsShopExpanded] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const accountSectionRef = useRef<HTMLDivElement>(null);
  const accountActionRef = useRef<HTMLButtonElement>(null);
  const lastRouteKeyRef = useRef<string>('');

  const DirectionalChevron = isRtl ? ChevronLeft : ChevronRight;

  const activeCategories = useMemo(() => {
    return (categories || [])
      .filter((c) => c.active !== false)
      .slice()
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }, [categories]);

  const wishlistCount = currentUser?.wishlist ? currentUser.wishlist.length : 0;
  const isSignedIn = Boolean(currentUser && !currentUser.isGuest);

  const getCategoryLabel = (cat: (typeof activeCategories)[number]) => {
    if (language === 'ar') return cat.nameAr || cat.nameEn;
    if (language === 'ru') return cat.nameRu || cat.nameEn;
    if (language === 'fr') return cat.nameFr || cat.nameEn;
    return cat.nameEn;
  };

  // Smooth open/close mount lifecycle for 220ms transition
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 230);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Body scroll lock while open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('drawer-scroll-locked');
      return () => {
        document.body.classList.remove('drawer-scroll-locked');
      };
    }
    document.body.classList.remove('drawer-scroll-locked');
  }, [isOpen]);

  // Focus initial control & restore trigger focus on close
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && isVisible) {
      wasOpenRef.current = true;
      if (focusTarget === 'account') {
        accountSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
        accountActionRef.current?.focus();
      } else {
        closeButtonRef.current?.focus();
      }
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      const targetBtn =
        focusTarget === 'account' ? accountTriggerRef.current : triggerRef.current;
      targetBtn?.focus();
    }
  }, [isOpen, isVisible, focusTarget, triggerRef, accountTriggerRef]);

  // Close drawer automatically on route/param changes while open
  const routeKey = `${currentPage}:${JSON.stringify(currentParams || {})}`;
  useEffect(() => {
    if (!isOpen) {
      lastRouteKeyRef.current = routeKey;
      return;
    }
    if (lastRouteKeyRef.current && lastRouteKeyRef.current !== routeKey) {
      onClose();
    }
    lastRouteKeyRef.current = routeKey;
  }, [routeKey, isOpen, onClose]);

  // Escape key & focus trap inside dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  const navigateAndClose = (page: string, params?: any) => {
    onNavigate(page, params);
    onClose();
  };

  const languageOptions: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'العربية' },
    { code: 'ru', label: 'RU' },
    { code: 'fr', label: 'FR' },
  ];

  const drawerTopStyle =
    typeof topOffset === 'number' ? `${Math.max(0, topOffset)}px` : 'var(--header-h)';

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      style={{ top: drawerTopStyle }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`mobile-drawer-backdrop absolute inset-0 bg-[#2E1F1B]/45 backdrop-blur-xs ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Full-height Lavender Drawer */}
      <div
        ref={drawerRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t.mobileMenu.menuLabel}
        className={`mobile-drawer-panel relative h-full w-full max-w-md ms-0 me-auto bg-[var(--color-card)] text-[var(--color-text)] border-e border-[var(--color-border)] shadow-2xl flex flex-col overflow-y-auto ${
          isVisible
            ? 'translate-x-0 opacity-100'
            : isRtl
              ? 'translate-x-6 opacity-0'
              : '-translate-x-6 opacity-0'
        }`}
      >
        {/* Top Row inside drawer: Greeting + Sign in / My account + Close */}
        <div
          ref={accountSectionRef}
          className="flex items-center justify-between gap-3 px-4 py-3.5 bg-[var(--color-lavender-bg)] border-b border-[var(--color-border)] shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[var(--color-maroon)] text-[var(--color-gold-highlight)] border border-[var(--color-gold)] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 text-start">
              <p className="font-heading text-lg font-semibold text-[var(--color-text)] truncate leading-tight">
                {isSignedIn && currentUser?.firstName
                  ? t.mobileMenu.hiUser.replace('{name}', currentUser.firstName)
                  : t.mobileMenu.hiGuest}
              </p>
              <button
                ref={accountActionRef}
                type="button"
                onClick={() => {
                  onClose();
                  if (isSignedIn) {
                    onNavigate('account');
                  } else {
                    openAuthModal('signin');
                  }
                }}
                className="text-xs font-semibold text-[var(--color-maroon)] underline underline-offset-2 hover:text-[var(--color-maroon-dark)] cursor-pointer py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] rounded-xs"
              >
                {isSignedIn ? t.mobileMenu.myAccount : t.mobileMenu.signIn}
              </button>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t.mobileMenu.closeMenu}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[var(--color-maroon)] hover:bg-[var(--color-maroon)]/10 active:bg-[var(--color-maroon)]/15 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Scrollable Content */}
        <nav className="flex-1 px-4 py-3 space-y-5" aria-label={t.mobileMenu.menuLabel}>
          {/* 1. Primary Links */}
          <div className="divide-y divide-[var(--color-border)]/70 border-b border-[var(--color-border)]">
            {/* Home */}
            <button
              type="button"
              onClick={() => navigateAndClose('home')}
              className={`w-full min-h-[48px] px-2 flex items-center justify-between gap-3 text-start text-sm font-semibold tracking-wide transition-colors active:bg-[var(--color-maroon)]/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] ${
                currentPage === 'home' ? 'text-[var(--color-maroon)]' : 'text-[var(--color-text)]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Home className="w-4 h-4 text-[var(--color-maroon)] shrink-0" />
                <span>{t.mobileMenu.home}</span>
              </span>
              <DirectionalChevron className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            </button>

            {/* Shop (Expandable Accordion with dynamic DB categories) */}
            <div>
              <button
                type="button"
                aria-expanded={isShopExpanded}
                onClick={() => setIsShopExpanded((prev) => !prev)}
                className={`w-full min-h-[48px] px-2 flex items-center justify-between gap-3 text-start text-sm font-semibold tracking-wide transition-colors active:bg-[var(--color-maroon)]/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] ${
                  currentPage === 'shop' ? 'text-[var(--color-maroon)]' : 'text-[var(--color-text)]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-[var(--color-maroon)] shrink-0" />
                  <span>{t.mobileMenu.shop}</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--color-text-secondary)] shrink-0 transition-transform duration-200 ${
                    isShopExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isShopExpanded && (
                <div className="ps-9 pe-2 pb-2 space-y-0.5 bg-[var(--color-lavender-bg)]/70 rounded-md mb-2">
                  <button
                    type="button"
                    onClick={() => navigateAndClose('shop')}
                    className="w-full min-h-[44px] px-2 flex items-center justify-between text-start text-[13px] font-semibold text-[var(--color-maroon)] active:bg-[var(--color-maroon)]/10 rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
                  >
                    <span>{t.mobileMenu.allCollections}</span>
                    <DirectionalChevron className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  {activeCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => navigateAndClose('shop', { category: cat.id })}
                      className="w-full min-h-[44px] px-2 flex items-center justify-between text-start text-[13px] font-medium text-[var(--color-text)] hover:text-[var(--color-maroon)] active:bg-[var(--color-maroon)]/10 rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
                    >
                      <span className="truncate">{getCategoryLabel(cat)}</span>
                      <DirectionalChevron className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* My Orders */}
            <button
              type="button"
              onClick={() => navigateAndClose('account', { tab: 'orders' })}
              className={`w-full min-h-[48px] px-2 flex items-center justify-between gap-3 text-start text-sm font-semibold tracking-wide transition-colors active:bg-[var(--color-maroon)]/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] ${
                currentPage === 'account' && currentParams?.tab !== 'wishlist'
                  ? 'text-[var(--color-maroon)]'
                  : 'text-[var(--color-text)]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Package className="w-4 h-4 text-[var(--color-maroon)] shrink-0" />
                <span>{t.mobileMenu.myOrders}</span>
              </span>
              <DirectionalChevron className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            </button>

            {/* Wishlist */}
            <button
              type="button"
              onClick={() => navigateAndClose('account', { tab: 'wishlist' })}
              className={`w-full min-h-[48px] px-2 flex items-center justify-between gap-3 text-start text-sm font-semibold tracking-wide transition-colors active:bg-[var(--color-maroon)]/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] ${
                currentPage === 'account' && currentParams?.tab === 'wishlist'
                  ? 'text-[var(--color-maroon)]'
                  : 'text-[var(--color-text)]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-[var(--color-maroon)] shrink-0" />
                <span>{t.mobileMenu.wishlist}</span>
                {wishlistCount > 0 && (
                  <span className="text-xs font-bold tabular-nums text-[var(--color-maroon)]">
                    ({wishlistCount})
                  </span>
                )}
              </span>
              <DirectionalChevron className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            </button>
          </div>

          {/* 2. Explore Collections (no gold tag pills; subtle SALE marker on Sale only) */}
          <div className="space-y-1">
            <h3 className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-gold-text)]">
              {t.mobileMenu.exploreCollections}
            </h3>

            <div className="divide-y divide-[var(--color-border)]/60">
              <button
                type="button"
                onClick={() => navigateAndClose('album')}
                className="w-full min-h-[48px] px-2 flex items-center justify-between gap-3 text-start text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-maroon)] active:bg-[var(--color-maroon)]/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <span className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-[var(--color-maroon)] shrink-0" />
                  <span>{t.mobileMenu.lookbookAlbum}</span>
                </span>
                <DirectionalChevron className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => navigateAndClose('shop', { filter: 'bestSeller' })}
                className="w-full min-h-[48px] px-2 flex items-center justify-between gap-3 text-start text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-maroon)] active:bg-[var(--color-maroon)]/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <span className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-[var(--color-maroon)] shrink-0" />
                  <span>{t.mobileMenu.bestSellers}</span>
                </span>
                <DirectionalChevron className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => navigateAndClose('shop', { filter: 'sale' })}
                className="w-full min-h-[48px] px-2 flex items-center justify-between gap-3 text-start text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-maroon)] active:bg-[var(--color-maroon)]/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <span className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-[var(--color-maroon)] shrink-0" />
                  <span>{t.mobileMenu.sale}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold-text)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" aria-hidden="true" />
                    {t.mobileMenu.saleMarker}
                  </span>
                </span>
                <DirectionalChevron className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </button>
            </div>
          </div>

          {/* 3. Language Switcher: 4 equal buttons, active filled maroon */}
          <div className="pt-2 border-t border-[var(--color-border)] space-y-2.5">
            <span className="px-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-gold-text)]">
              {t.mobileMenu.language}
            </span>
            <div className="grid grid-cols-4 gap-2 px-1">
              {languageOptions.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setLanguage(opt.code)}
                    aria-pressed={isSelected}
                    className={`min-h-[44px] px-1 rounded-full border text-xs font-semibold text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] ${
                      isSelected
                        ? 'bg-[var(--color-maroon)] text-white border-[var(--color-maroon)] shadow-xs'
                        : 'bg-[var(--color-lavender-bg)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-maroon)] active:bg-[var(--color-maroon)]/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* 4. Footer Area: WhatsApp contact button + Delivery & returns link */}
        <div className="mt-auto px-4 pt-3 pb-4 border-t border-[var(--color-border)] bg-[var(--color-lavender-bg)] space-y-2 shrink-0">
          <a
            href={`https://wa.me/${storeConfig.whatsappPhoneRaw}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] px-4 rounded-full bg-[var(--color-maroon)] hover:bg-[var(--color-maroon-dark)] active:scale-[0.99] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border border-[var(--color-gold)]/50 transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <MessageCircle className="w-4 h-4 text-[var(--color-gold-highlight)] shrink-0" />
            <span>{t.mobileMenu.contactWhatsapp}</span>
          </a>

          <button
            type="button"
            onClick={() => navigateAndClose('legal', { section: 'shipping' })}
            className="w-full min-h-[48px] px-3 rounded-full text-xs font-semibold text-[var(--color-maroon)] hover:bg-[var(--color-maroon)]/5 active:bg-[var(--color-maroon)]/10 flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>{t.mobileMenu.deliveryReturns}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
