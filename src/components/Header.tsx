import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  BookOpen,
  Flame,
  Tag,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AnnouncementBar } from './AnnouncementBar';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import boutiqueLogo from '../assets/images/boutique_logo.jpeg';

interface HeaderProps {
  onNavigate: (page: string, params?: any) => void;
  currentPage: string;
  currentParams?: any;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, currentParams }) => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { cartCount, setIsCartOpen } = useCart();
  const { currentUser, openAuthModal } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [drawerFocusTarget, setDrawerFocusTarget] = useState<'close' | 'account'>('close');
  const [drawerTopOffset, setDrawerTopOffset] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Desktop Explore Menu State
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const exploreMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  const wishlistCount = currentUser?.wishlist ? currentUser.wishlist.length : 0;

  const measureHeaderBottom = useCallback(() => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      setDrawerTopOffset(Math.max(0, Math.round(rect.bottom)));
    }
  }, []);

  const openDrawer = (target: 'close' | 'account') => {
    measureHeaderBottom();
    setDrawerFocusTarget(target);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(true);
  };

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleResizeOrScroll = () => measureHeaderBottom();
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [isMobileMenuOpen, measureHeaderBottom]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exploreMenuRef.current && !exploreMenuRef.current.contains(event.target as Node)) {
        setIsExploreOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExploreOpen(false);
        setIsSearchOpen(false);
      }
    };

    if (isExploreOpen || isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExploreOpen, isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      if (window.innerWidth < 1024) {
        mobileSearchInputRef.current?.focus();
      } else {
        searchInputRef.current?.focus();
      }
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('shop', { search: searchQuery.trim() });
      setIsSearchOpen(false);
    }
  };

  // Desktop Explore highlights
  const exploreItems = [
    {
      id: 'album',
      label: t.mobileMenu.lookbookAlbum,
      subtitle:
        language === 'ar'
          ? 'جلسات تصوير وتنسيقات ملابس النوم الفاخرة'
          : language === 'ru'
            ? 'Стилизованные фотосессии и лукбук'
            : language === 'fr'
              ? 'Séances photos et silhouettes haute couture'
              : 'Curated styling & editorial photo sessions',
      badge:
        language === 'ar'
          ? 'معرض الصور'
          : language === 'ru'
            ? 'Галерея'
            : language === 'fr'
              ? 'Galerie'
              : 'Visual Gallery',
      icon: BookOpen,
      action: () => onNavigate('album'),
      isActive: currentPage === 'album',
    },
    {
      id: 'best-sellers',
      label: t.nav.bestSellers,
      subtitle:
        language === 'ar'
          ? 'القطع الأكثر طلباً وإعجاباً في البحرين'
          : language === 'ru'
            ? 'Самые популярные модели из шёлка и сатина'
            : language === 'fr'
              ? 'Les incontournables en soie et satin à Bahreïn'
              : 'Most-loved luxury silk & satin essentials',
      badge:
        language === 'ar'
          ? 'الأكثر طلباً'
          : language === 'ru'
            ? 'Хит'
            : language === 'fr'
              ? 'Culte'
              : 'Top Rated',
      icon: Flame,
      action: () => onNavigate('shop', { filter: 'bestSeller' }),
      isActive: currentPage === 'shop' && currentParams?.filter === 'bestSeller',
    },
    {
      id: 'sale',
      label: t.nav.sale,
      subtitle:
        language === 'ar'
          ? 'تخفيضات وعروض حصرية على أطقم ملابس النوم'
          : language === 'ru'
            ? 'Эксклюзивные сезонные скидки на пижамы'
            : language === 'fr'
              ? 'Réductions saisonnières exclusives sur les pyjamas'
              : 'Exclusive seasonal promotions & special pricing',
      badge:
        language === 'ar'
          ? 'عروض خاصة'
          : language === 'ru'
            ? 'Скидки'
            : language === 'fr'
              ? 'Privilèges'
              : 'Special Offers',
      icon: Tag,
      action: () => onNavigate('shop', { filter: 'sale' }),
      isActive: currentPage === 'shop' && currentParams?.filter === 'sale',
    },
  ];

  const isExploreActive = exploreItems.some((item) => item.isActive);

  return (
    <>
      {/* 1. Non-sticky Announcement Bar (scrolls away cleanly) */}
      <AnnouncementBar />

      {/* 2. Sticky Header (56px mobile, 64px >= md) */}
      <header
        ref={headerRef}
        className="sticky top-0 z-40 h-[var(--header-h)] bg-[var(--maroon-700)] border-b border-[var(--gold-decor)]/40 shadow-md transition-colors"
      >
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full w-full gap-1">
            {/* Start: Hamburger/Close + Logo */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink-0 min-w-0">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => {
                  if (isMobileMenuOpen) {
                    setIsMobileMenuOpen(false);
                  } else {
                    openDrawer('close');
                  }
                }}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav-drawer"
                aria-label={isMobileMenuOpen ? t.mobileMenu.closeMenu : t.mobileMenu.openMenu}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-on-maroon)] hover:bg-[var(--maroon-600)] active:bg-white/10 transition-colors rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('home')}
                aria-label="Deluxe Bedtime Store"
                className="min-h-[44px] px-1 text-start group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)] rounded-md flex items-center gap-2 shrink-0"
              >
                <div className="w-8 h-8 rounded-full border border-[var(--gold-decor)] bg-[var(--maroon-900)] overflow-hidden flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <img
                    src={boutiqueLogo}
                    alt="Deluxe Bedtime Store"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Hidden below 480px so it never crowds mobile icon controls */}
                <span
                  className="hidden min-[480px]:inline-block font-serif text-xs min-[480px]:text-sm lg:text-base font-semibold tracking-[0.12em] lg:tracking-[0.22em] uppercase text-[var(--text-on-maroon)] group-hover:text-[var(--surface-champagne)] transition-colors select-none leading-none pt-0.5 whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  DELUXE BEDTIME STORE
                </span>
              </button>
            </div>

            {/* Center-start Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-7 ms-8 me-auto" aria-label="Main navigation">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-decor)] rounded-xs ${
                  currentPage === 'home'
                    ? 'text-[var(--text-on-maroon)] after:content-[""] after:absolute after:-bottom-[2px] after:inset-x-0 after:h-[2px] after:bg-[var(--gold-decor)]'
                    : 'text-[var(--text-on-maroon)]/85 hover:text-[var(--surface-champagne)]'
                }`}
              >
                {t.nav.home}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-decor)] rounded-xs ${
                  currentPage === 'shop'
                    ? 'text-[var(--text-on-maroon)] after:content-[""] after:absolute after:-bottom-[2px] after:inset-x-0 after:h-[2px] after:bg-[var(--gold-decor)]'
                    : 'text-[var(--text-on-maroon)]/85 hover:text-[var(--surface-champagne)]'
                }`}
              >
                {t.nav.shop}
              </button>

              {/* Desktop Explore Dropdown */}
              <div className="relative" ref={exploreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExploreOpen(!isExploreOpen)}
                  aria-expanded={isExploreOpen}
                  aria-haspopup="true"
                  className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors inline-flex items-center gap-1 relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-decor)] rounded-xs ${
                    isExploreOpen || isExploreActive
                      ? 'text-[var(--text-on-maroon)] after:content-[""] after:absolute after:-bottom-[2px] after:inset-x-0 after:h-[2px] after:bg-[var(--gold-decor)]'
                      : 'text-[var(--text-on-maroon)]/85 hover:text-[var(--surface-champagne)]'
                  }`}
                >
                  <span>{language === 'ar' ? 'استكشف' : 'EXPLORE'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--gold-decor)] transition-transform duration-200 ${
                      isExploreOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExploreOpen && (
                  <div className="absolute top-full end-0 mt-3 z-50 w-80 bg-[var(--surface-card)] rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] p-3 text-start">
                    <div className="px-3 py-1.5 border-b border-[var(--line)] mb-2 flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                        {language === 'ar' ? 'مختارات المتجر' : 'Curated Highlights'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--maroon-700)] text-[var(--text-on-maroon)] font-semibold">
                        3 {language === 'ar' ? 'أقسام' : 'Collections'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {exploreItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              item.action();
                              setIsExploreOpen(false);
                            }}
                            className={`w-full p-2.5 rounded-lg transition-all text-start flex items-start gap-3 cursor-pointer ${
                              item.isActive
                                ? 'bg-[var(--surface-champagne)] border border-[var(--gold-decor)] text-[var(--maroon-700)]'
                                : 'hover:bg-[var(--surface-page)] text-[var(--text-strong)] hover:text-[var(--maroon-700)]'
                            }`}
                          >
                            <div className="p-2 rounded-md bg-[var(--surface-page)] text-[var(--maroon-700)] shrink-0 mt-0.5 border border-[var(--line)]">
                              <IconComponent className="w-4 h-4 stroke-[2]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  {item.label}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xs bg-[var(--surface-champagne)] text-[var(--maroon-700)] border border-[var(--gold-decor)]/60">
                                  {item.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-body)] leading-tight mt-0.5 truncate">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-[var(--line)] px-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1 text-[var(--maroon-700)]">
                        <Sparkles className="w-3 h-3 text-[var(--gold-text)]" />
                        <span>
                          {language === 'ar'
                            ? 'توصيل مجاني فوق ٢٥ د.ب'
                            : language === 'ru'
                              ? 'Бесплатная доставка от 25 BHD'
                              : 'Free delivery over 25 BHD'}
                        </span>
                      </span>
                      <span className="font-serif italic text-[var(--maroon-700)]">
                        Deluxe Bedtime Store
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* End Actions: Mobile icon-only controls (44x44px) | Desktop preserved */}
            <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2.5 shrink-0 ms-auto">
              {/* 1. Search (Icon-only button on mobile; inline search on desktop) */}
              <div className="relative flex items-center">
                {isSearchOpen && (
                  <form
                    onSubmit={handleSearchSubmit}
                    className="hidden lg:flex items-center me-1"
                  >
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.mobileMenu.searchPlaceholder}
                      className="token-input w-48 px-3 py-1.5 text-xs border rounded-[var(--radius-pill)]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--text-on-maroon)] hover:text-[var(--surface-champagne)] cursor-pointer"
                      aria-label={t.mobileMenu.closeSearch}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  aria-expanded={isSearchOpen}
                  aria-label={isSearchOpen ? t.mobileMenu.closeSearch : t.mobileMenu.openSearch}
                  className={`${
                    isSearchOpen ? 'lg:hidden' : ''
                  } min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-on-maroon)] hover:bg-[var(--maroon-600)] active:bg-white/10 transition-colors rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]`}
                >
                  <Search className="w-5 h-5 lg:w-4 lg:h-4 stroke-[2]" />
                </button>
              </div>

              {/* 2. Mobile Avatar Icon (opens Account section in mobile drawer) */}
              <button
                ref={accountButtonRef}
                type="button"
                onClick={() => openDrawer('account')}
                aria-label={t.mobileMenu.openAccount}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-on-maroon)] hover:bg-[var(--maroon-600)] active:bg-white/10 transition-colors rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
              >
                <User className="w-5 h-5 stroke-[2]" />
              </button>

              {/* Desktop Account Pill */}
              <button
                type="button"
                onClick={() =>
                  currentUser && !currentUser.isGuest ? onNavigate('account') : openAuthModal('signin')
                }
                className="hidden lg:flex items-center gap-1.5 py-1.5 px-3 rounded-[var(--radius-pill)] border border-[var(--gold-decor)] bg-[var(--maroon-900)]/55 hover:bg-[var(--maroon-600)] transition-all text-xs text-[var(--text-on-maroon)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
                title={currentUser?.firstName ? `${currentUser.firstName} (${t.nav.account})` : t.nav.account}
              >
                <div className="w-4 h-4 rounded-full bg-[var(--gold-decor)] text-[var(--maroon-900)] flex items-center justify-center font-bold text-[9px] shrink-0">
                  <User className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span className="font-medium text-[11px] tracking-wide">
                  {currentUser && !currentUser.isGuest ? currentUser.firstName : t.nav.account}
                </span>
              </button>

              {/* 3. Wishlist Icon Button (44x44px hit area, logical end gold badge) */}
              <button
                type="button"
                onClick={() => onNavigate('account', { tab: 'wishlist' })}
                aria-label={t.mobileMenu.openWishlist}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-on-maroon)] hover:bg-[var(--maroon-600)] active:bg-white/10 transition-colors relative rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
              >
                <Heart className="w-5 h-5 lg:w-4 lg:h-4 stroke-[2]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 text-[10px] leading-none flex items-center justify-center bg-[var(--gold-decor)] text-[var(--maroon-900)] font-bold rounded-full tabular-nums shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* 4. Mobile Bag Icon Button (icon-only, 44x44px hit area, logical end gold badge) */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label={`${t.mobileMenu.openBag} (${cartCount})`}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-on-maroon)] hover:bg-[var(--maroon-600)] active:bg-white/10 transition-colors relative rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
              >
                <ShoppingBag className="w-5 h-5 stroke-[2]" />
                {cartCount > 0 && (
                  <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 text-[10px] leading-none flex items-center justify-center bg-[var(--gold-decor)] text-[var(--maroon-900)] font-bold rounded-full tabular-nums shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Desktop Bag Button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="hidden lg:flex items-center gap-1.5 py-1.5 px-3 border border-[var(--gold-decor)] bg-[var(--maroon-900)]/55 hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] rounded-lg transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
                aria-label={`${t.mobileMenu.openBag} (${cartCount})`}
              >
                <div className="relative">
                  <ShoppingBag className="w-3.5 h-3.5 text-[var(--text-on-maroon)] stroke-[2]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -end-2.5 min-w-[18px] h-[18px] px-1 bg-[var(--gold-decor)] text-[var(--maroon-900)] text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  {language === 'ar' ? 'الحقيبة' : language === 'ru' ? 'Корзина' : language === 'fr' ? 'Panier' : 'BAG'}
                </span>
              </button>

              {/* 5. Desktop Language Pill Switcher (inactive white/line/maroon-700, active maroon-700/white) */}
              <div className="hidden lg:flex items-center gap-0.5 border border-[var(--gold-decor)] rounded-[var(--radius-pill)] p-0.5 bg-[var(--surface-champagne)] shadow-xs">
                {(['en', 'ar', 'ru', 'fr'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={language === code}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-[var(--radius-pill)] transition-all cursor-pointer ${
                      language === code
                        ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] shadow-xs'
                        : 'bg-[var(--surface-card)] text-[var(--maroon-700)] border border-[var(--line)] hover:border-[var(--maroon-700)]'
                    }`}
                  >
                    {code === 'ar' ? 'العربية' : code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Expandable Search Strip directly below sticky header */}
        {isSearchOpen && (
          <div className="lg:hidden bg-[var(--maroon-900)] border-b border-[var(--gold-decor)]/40 px-3 py-2 shadow-lg">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.mobileMenu.searchPlaceholder}
                  className="token-input w-full min-h-[44px] ps-10 pe-4 text-base rounded-[var(--radius-pill)] border"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                aria-label={t.mobileMenu.closeSearch}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--text-on-maroon)] hover:bg-[var(--maroon-600)] active:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* 3. Full-height Mobile Navigation Drawer */}
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        triggerRef={menuButtonRef}
        accountTriggerRef={accountButtonRef}
        focusTarget={drawerFocusTarget}
        topOffset={drawerTopOffset}
        onNavigate={onNavigate}
        currentPage={currentPage}
        currentParams={currentParams}
      />
    </>
  );
};
