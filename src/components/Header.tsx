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
        className="sticky top-0 z-40 h-[var(--header-h)] bg-[var(--color-maroon)] border-b border-[var(--color-gold)]/40 shadow-md transition-colors"
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
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#E3C878] hover:text-white active:bg-white/10 transition-colors rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('home')}
                aria-label="Deluxe Bedtime Store"
                className="min-h-[44px] px-1 text-start group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] rounded-md flex items-center gap-2 shrink-0"
              >
                <div className="w-8 h-8 rounded-full border border-[var(--color-gold)] bg-[#4A0A15] overflow-hidden flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <img
                    src={boutiqueLogo}
                    alt="Deluxe Bedtime Store"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Hidden below 480px so it never crowds mobile icon controls */}
                <span
                  className="hidden min-[480px]:inline-block font-serif text-xs min-[480px]:text-sm lg:text-base font-semibold tracking-[0.12em] lg:tracking-[0.22em] uppercase text-[#E3C878] group-hover:text-white transition-colors select-none leading-none pt-0.5 whitespace-nowrap"
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
                className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A04A] rounded-xs ${
                  currentPage === 'home'
                    ? 'text-[#E3C878] after:content-[""] after:absolute after:-bottom-[2px] after:inset-x-0 after:h-[1.5px] after:bg-[#C9A04A]'
                    : 'text-[#FBF4E4]/90 hover:text-[#E3C878]'
                }`}
              >
                {t.nav.home}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A04A] rounded-xs ${
                  currentPage === 'shop'
                    ? 'text-[#E3C878] after:content-[""] after:absolute after:-bottom-[2px] after:inset-x-0 after:h-[1.5px] after:bg-[#C9A04A]'
                    : 'text-[#FBF4E4]/90 hover:text-[#E3C878]'
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
                  className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A04A] rounded-xs ${
                    isExploreOpen || isExploreActive
                      ? 'text-[#E3C878]'
                      : 'text-[#FBF4E4]/90 hover:text-[#E3C878]'
                  }`}
                >
                  <span>{language === 'ar' ? 'استكشف' : 'EXPLORE'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#E3C878] transition-transform duration-200 ${
                      isExploreOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExploreOpen && (
                  <div className="absolute top-full end-0 mt-3 z-50 w-80 bg-[var(--color-card)] rounded-[10px] border border-[var(--color-border)] shadow-xl p-3 text-start">
                    <div className="px-3 py-1.5 border-b border-[var(--color-border)] mb-2 flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--color-text-secondary)]">
                        {language === 'ar' ? 'مختارات المتجر' : 'Curated Highlights'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white font-semibold">
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
                                ? 'bg-[var(--color-bg)] border border-[var(--color-accent)] text-[var(--color-primary)]'
                                : 'hover:bg-[var(--color-bg)] text-[var(--color-text)] hover:text-[var(--color-primary)]'
                            }`}
                          >
                            <div className="p-2 rounded-md bg-[var(--color-bg)] text-[var(--color-primary)] shrink-0 mt-0.5">
                              <IconComponent className="w-4 h-4 stroke-[2]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  {item.label}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-xs bg-[var(--color-accent)] text-[var(--color-text)]">
                                  {item.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight mt-0.5 truncate">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-[var(--color-border)] px-2 flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1 text-[var(--color-primary)]">
                        <Sparkles className="w-3 h-3 text-[var(--color-accent)]" />
                        <span>
                          {language === 'ar'
                            ? 'توصيل مجاني فوق ٢٥ د.ب'
                            : language === 'ru'
                              ? 'Бесплатная доставка от 25 BHD'
                              : 'Free delivery over 25 BHD'}
                        </span>
                      </span>
                      <span className="font-serif italic text-[var(--color-primary)]">
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
                      className="w-48 px-3 py-1.5 text-xs bg-white text-[#2E1F1B] border border-[#C9A04A] rounded-full focus:outline-none focus:ring-2 focus:ring-[#C9A04A]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#E3C878] hover:text-white"
                      aria-label={t.mobileMenu.closeSearch}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {(!isSearchOpen || true) && (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen((prev) => !prev)}
                    aria-expanded={isSearchOpen}
                    aria-label={isSearchOpen ? t.mobileMenu.closeSearch : t.mobileMenu.openSearch}
                    className={`${
                      isSearchOpen ? 'lg:hidden' : ''
                    } min-w-[44px] min-h-[44px] flex items-center justify-center text-[#E3C878] hover:text-white active:bg-white/10 transition-colors rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]`}
                  >
                    <Search className="w-5 h-5 lg:w-4 lg:h-4 stroke-[2]" />
                  </button>
                )}
              </div>

              {/* 2. Mobile Avatar Icon (opens Account section in mobile drawer) */}
              <button
                ref={accountButtonRef}
                type="button"
                onClick={() => openDrawer('account')}
                aria-label={t.mobileMenu.openAccount}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#E3C878] hover:text-white active:bg-white/10 transition-colors rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <User className="w-5 h-5 stroke-[2]" />
              </button>

              {/* Desktop Account Pill */}
              <button
                type="button"
                onClick={() =>
                  currentUser && !currentUser.isGuest ? onNavigate('account') : openAuthModal('signin')
                }
                className="hidden lg:flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-[#C9A04A] hover:border-[#E3C878] bg-[#4A0A15]/40 hover:bg-[#4A0A15]/80 transition-all text-xs text-[#FBF4E4] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A04A]"
                title={currentUser?.firstName ? `${currentUser.firstName} (${t.nav.account})` : t.nav.account}
              >
                <div className="w-4 h-4 rounded-full bg-[#C9A04A] text-[#4A0A15] flex items-center justify-center font-bold text-[9px] shrink-0">
                  <User className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span className="font-medium text-[11px] tracking-wide">
                  {currentUser && !currentUser.isGuest ? currentUser.firstName : t.nav.account}
                </span>
              </button>

              {/* 3. Wishlist Icon Button (44x44px hit area, logical end badge) */}
              <button
                type="button"
                onClick={() => onNavigate('account', { tab: 'wishlist' })}
                aria-label={t.mobileMenu.openWishlist}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#E3C878] hover:text-white active:bg-white/10 transition-colors relative rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <Heart className="w-5 h-5 lg:w-4 lg:h-4 stroke-[2]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 text-[10px] leading-none flex items-center justify-center bg-[#C9A04A] text-[#4A0A15] font-bold rounded-full tabular-nums shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* 4. Mobile Bag Icon Button (icon-only, 44x44px hit area, logical end badge) */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label={`${t.mobileMenu.openBag} (${cartCount})`}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#E3C878] hover:text-white active:bg-white/10 transition-colors relative rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
              >
                <ShoppingBag className="w-5 h-5 stroke-[2]" />
                {cartCount > 0 && (
                  <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 text-[10px] leading-none flex items-center justify-center bg-[#E3C878] text-[#4A0A15] font-bold rounded-full tabular-nums shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Desktop Bag Button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="hidden lg:flex items-center gap-1.5 py-1.5 px-3 border border-[#C9A04A] hover:border-[#E3C878] bg-[#4A0A15]/40 hover:bg-[#4A0A15]/80 text-[#FBF4E4] rounded-lg transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A04A]"
                aria-label={`${t.mobileMenu.openBag} (${cartCount})`}
              >
                <div className="relative">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#E3C878] stroke-[2]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -end-2.5 min-w-[18px] h-[18px] px-1 bg-[#E3C878] text-[#4A0A15] text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  {language === 'ar' ? 'الحقيبة' : language === 'ru' ? 'Корзина' : language === 'fr' ? 'Panier' : 'BAG'}
                </span>
              </button>

              {/* 5. Desktop Language Pill Switcher */}
              <div className="hidden lg:flex items-center border border-[#C9A04A] rounded-full p-0.5 bg-[#4A0A15]/50 shadow-xs">
                {(['en', 'ar', 'ru', 'fr'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                      language === code
                        ? 'bg-[#C9A04A] text-[#4A0A15] shadow-xs font-black'
                        : 'text-[#FBF4E4]/80 hover:text-[#E3C878]'
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
          <div className="lg:hidden bg-[var(--color-maroon-dark)] border-b border-[var(--color-gold)]/40 px-3 py-2 shadow-lg">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.mobileMenu.searchPlaceholder}
                  className="w-full min-h-[44px] ps-10 pe-4 bg-white text-[var(--color-text)] text-base rounded-full border border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                aria-label={t.mobileMenu.closeSearch}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#E3C878] hover:text-white active:bg-white/10"
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
