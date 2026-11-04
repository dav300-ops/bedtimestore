import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Heart, 
  User, 
  Search, 
  Menu, 
  X, 
  ShieldCheck, 
  Globe,
  BookOpen,
  Flame,
  Tag,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AnnouncementBar } from './AnnouncementBar';
import boutiqueLogo from '../assets/images/boutique_logo.jpeg';

interface HeaderProps {
  onNavigate: (page: string, params?: any) => void;
  currentPage: string;
  currentParams?: any;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, currentParams }) => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { cartCount, setIsCartOpen } = useCart();
  const { currentUser, isAdmin, openAuthModal } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Desktop Explore Menu State & Ref for Click-Outside / Escape
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const exploreMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('shop', { search: searchQuery.trim() });
      setIsSearchOpen(false);
    }
  };

  // Highlights curated into the Explore dropdown
  const exploreItems = [
    {
      id: 'album',
      label: (t.nav as any).album || (language === 'ar' ? 'ألبوم الصور' : language === 'ru' ? 'Лукбук' : language === 'fr' ? 'Lookbook' : 'Lookbook Album'),
      subtitle: language === 'ar' ? 'جلسات تصوير وتنسيقات ملابس النوم الفاخرة' : language === 'ru' ? 'Стилизованные фотосессии и лукбук' : language === 'fr' ? 'Séances photos et silhouettes haute couture' : 'Curated styling & editorial photo sessions',
      badge: language === 'ar' ? 'معرض الصور' : language === 'ru' ? 'Галерея' : language === 'fr' ? 'Galerie' : 'Visual Gallery',
      badgeColor: 'bg-[var(--color-card)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]',
      icon: BookOpen,
      action: () => onNavigate('album'),
      isActive: currentPage === 'album',
    },
    {
      id: 'best-sellers',
      label: t.nav.bestSellers,
      subtitle: language === 'ar' ? 'القطع الأكثر طلباً وإعجاباً في البحرين' : language === 'ru' ? 'Самые популярные модели из шёлка и сатина' : language === 'fr' ? 'Les incontournables en soie et satin à Bahreïn' : 'Most-loved luxury silk & satin essentials',
      badge: language === 'ar' ? 'الأكثر طلباً' : language === 'ru' ? 'Хит' : language === 'fr' ? 'Culte' : 'Top Rated',
      badgeColor: 'bg-[var(--color-card)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]',
      icon: Flame,
      action: () => onNavigate('shop', { filter: 'bestSeller' }),
      isActive: currentPage === 'shop' && currentParams?.filter === 'bestSeller',
    },
    {
      id: 'sale',
      label: t.nav.sale,
      subtitle: language === 'ar' ? 'تخفيضات وعروض حصرية على أطقم ملابس النوم' : language === 'ru' ? 'Эксклюзивные сезонные скидки на пижамы' : language === 'fr' ? 'Réductions saisonnières exclusives sur les pyjamas' : 'Exclusive seasonal promotions & special pricing',
      badge: language === 'ar' ? 'عروض خاصة' : language === 'ru' ? 'Скидки' : language === 'fr' ? 'Privilèges' : 'Special Offers',
      badgeColor: 'bg-[var(--color-card)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]',
      icon: Tag,
      action: () => onNavigate('shop', { filter: 'sale' }),
      isActive: currentPage === 'shop' && currentParams?.filter === 'sale',
    },
  ];

  const isExploreActive = exploreItems.some((item) => item.isActive);

  return (
    <>
      {/* 1. Announcement Bar (36px, var(--color-primary), 13px white text) */}
      <AnnouncementBar />

      {/* 2. Sticky Header (68px, Burgundy background, gold hairline border) */}
      <header 
        className="sticky top-0 z-40 bg-[var(--color-primary)] border-b border-[var(--color-gold)]/30 transition-colors shadow-sm"
        style={{ 
          backgroundColor: 'var(--color-primary)',
          borderColor: 'rgba(184, 137, 58, 0.3)'
        }}
      >
        <div className="w-full px-4 sm:px-6 md:px-12">
          <div className="flex items-center justify-between h-[68px] w-full">
            
            {/* Zone 1: Logo "BEDTIME STORE" on the left */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-white hover:text-[var(--color-gold-light)] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)]"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-left rtl:text-right group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)] rounded-xs flex items-center gap-2.5 sm:gap-3"
              >
                <img
                  src={boutiqueLogo}
                  alt="Bedtime Store Logo"
                  className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-xs border border-[var(--color-gold-light)]/50 group-hover:scale-105 transition-transform shrink-0"
                />
                <span 
                  className="font-serif text-[22px] sm:text-[28px] font-bold tracking-tight leading-none select-none text-white group-hover:text-[var(--color-gold-light)] transition-colors"
                  style={{ 
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    color: '#FFFFFF'
                  }}
                >
                  BEDTIME STORE
                </span>
              </button>
            </div>

            {/* Zone 2: Center Nav HOME, SHOP, EXPLORE (active underline in gold) */}
            <nav className="hidden lg:flex items-center gap-8 mx-auto">
              {/* HOME link (active underline in gold #D4AF5F) */}
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className={`text-[15px] font-semibold tracking-[0.06em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)] rounded-xs ${
                  currentPage === 'home'
                    ? 'text-[var(--color-gold-light)] after:content-[""] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-gold-light)]'
                    : 'text-white/90 hover:text-[var(--color-gold-light)]'
                }`}
              >
                {t.nav.home}
              </button>

              {/* SHOP link (active on shop page with 2px underline in gold) */}
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className={`text-[15px] font-semibold tracking-[0.06em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)] rounded-xs ${
                  currentPage === 'shop'
                    ? 'text-[var(--color-gold-light)] after:content-[""] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-gold-light)]'
                    : 'text-white/90 hover:text-[var(--color-gold-light)]'
                }`}
              >
                {t.nav.shop}
              </button>

              {/* EXPLORE dropdown link */}
              <div className="relative" ref={exploreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExploreOpen(!isExploreOpen)}
                  aria-expanded={isExploreOpen}
                  aria-haspopup="true"
                  className={`text-[15px] font-semibold tracking-[0.06em] uppercase py-1 cursor-pointer transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)] rounded-xs ${
                    isExploreOpen || isExploreActive
                      ? 'text-[var(--color-gold-light)]'
                      : 'text-white/90 hover:text-[var(--color-gold-light)]'
                  }`}
                >
                  <span>{language === 'ar' ? 'استكشف' : 'EXPLORE'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-gold-light)] transition-transform duration-200 ${isExploreOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Explore Dropdown Panel */}
                {isExploreOpen && (
                  <div
                    className={`absolute top-full mt-3 z-50 w-80 bg-[var(--color-card)] rounded-[10px] border border-[var(--color-border)] shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-150 ${
                      isRtl ? 'left-0 text-right' : 'right-0 text-left'
                    }`}
                  >
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
                            className={`w-full p-2.5 rounded-lg transition-all text-left rtl:text-right flex items-start gap-3 cursor-pointer ${
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
                        <span>{language === 'ar' ? 'توصيل مجاني فوق ٢٥ د.ب' : language === 'ru' ? 'Бесплатная доставка от 25 BHD' : 'Free delivery over 25 BHD'}</span>
                      </span>
                      <span className="font-serif italic text-[var(--color-primary)]">Bedtime Store</span>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Zone 3: Right side: Search, Sign in, Wishlist, Bag with live count */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              
              {/* Search */}
              <div className="relative">
                {isSearchOpen ? (
                  <form onSubmit={handleSearchSubmit} className="flex items-center">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={language === 'ar' ? 'بحث في المتجر...' : language === 'ru' ? 'Поиск в бутике...' : 'Search sleepwear...'}
                      className="w-36 sm:w-56 px-3 py-1.5 text-xs bg-white text-[var(--color-text)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="p-1.5 text-white/80 hover:text-[var(--color-gold-light)]"
                      aria-label="Close search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2 text-white/90 hover:text-[var(--color-gold-light)] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)]"
                    aria-label="Search"
                    title="Search"
                  >
                    <Search className="w-5 h-5 stroke-[1.8]" />
                  </button>
                )}
              </div>

              {/* Sign in / Account */}
              {currentUser && !currentUser.isGuest ? (
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="flex items-center gap-1.5 py-1 px-2.5 rounded-full border border-[var(--color-gold-light)]/40 hover:border-[var(--color-gold-light)] bg-white/10 hover:bg-white/15 transition-all text-xs text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)]"
                  title={`${currentUser.firstName} (${t.nav.account})`}
                >
                  <span className="hidden md:inline font-medium text-[12px] max-w-[80px] truncate">
                    {currentUser.firstName}
                  </span>
                  <div className="w-5 h-5 rounded-full bg-[var(--color-gold-light)] text-[var(--color-primary)] flex items-center justify-center font-bold text-[10px]">
                    {currentUser.firstName.charAt(0)}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 text-white/95 hover:text-[var(--color-gold-light)] border border-[var(--color-gold-light)]/30 hover:border-[var(--color-gold-light)] hover:bg-white/5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)]"
                  aria-label="Sign In"
                  title={t.account.signIn}
                >
                  <User className="w-4 h-4 stroke-[1.8]" />
                  <span className="hidden sm:inline">{t.account.signIn}</span>
                </button>
              )}

              {/* Wishlist */}
              <button
                type="button"
                onClick={() => onNavigate('account', { tab: 'wishlist' })}
                className="p-2 text-white/90 hover:text-[var(--color-gold-light)] transition-colors relative rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)]"
                aria-label="Wishlist"
                title={t.nav.wishlist}
              >
                <Heart className="w-5 h-5 stroke-[1.8]" />
                {currentUser && currentUser.wishlist && currentUser.wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 text-[10px] flex items-center justify-center bg-[var(--color-gold-light)] text-[var(--color-primary)] font-bold rounded-full px-1">
                    {currentUser.wishlist.length}
                  </span>
                )}
              </button>

              {/* Bag with live item count */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-[var(--color-primary-hover)] hover:bg-[#4a0815] text-white border border-[var(--color-gold-light)]/50 hover:border-[var(--color-gold-light)] rounded-md transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-light)]"
                aria-label={`Bag with ${cartCount} items`}
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
                  {cartCount > 0 && (
                    <span 
                      className="absolute -top-2 -right-2 bg-[var(--color-gold-light)] text-[var(--color-primary)] text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums shadow-xs"
                    >
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-semibold tracking-wider uppercase">
                  {language === 'ar' ? 'الحقيبة' : language === 'ru' ? 'Корзина' : language === 'fr' ? 'Panier' : 'Bag'}
                </span>
              </button>

              {/* 4-Language Switcher (EN · AR · RU · FR) & Admin shortcut */}
              <div className="hidden lg:flex items-center gap-1.5 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-[var(--color-gold-light)]/30">
                <div className="flex items-center bg-black/20 border border-[var(--color-gold-light)]/30 rounded-full p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-[var(--color-gold-light)] text-[var(--color-primary)] shadow-xs font-black'
                        : 'text-white/80 hover:text-[var(--color-gold-light)]'
                    }`}
                    title="English"
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ar')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                      language === 'ar'
                        ? 'bg-[var(--color-gold-light)] text-[var(--color-primary)] shadow-xs font-black'
                        : 'text-white/80 hover:text-[var(--color-gold-light)]'
                    }`}
                    title="العربية"
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ru')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                      language === 'ru'
                        ? 'bg-[var(--color-gold-light)] text-[var(--color-primary)] shadow-xs font-black'
                        : 'text-white/80 hover:text-[var(--color-gold-light)]'
                    }`}
                    title="Русский"
                  >
                    RU
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('fr')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                      language === 'fr'
                        ? 'bg-[var(--color-gold-light)] text-[var(--color-primary)] shadow-xs font-black'
                        : 'text-white/80 hover:text-[var(--color-gold-light)]'
                    }`}
                    title="Français"
                  >
                    FR
                  </button>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin')}
                    className="p-1 text-[var(--color-gold-light)] hover:text-white hover:bg-white/10 rounded-full transition-colors ml-0.5"
                    title="Admin"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[var(--color-card)] border-t border-[var(--color-border)] px-6 py-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left rtl:text-right py-2 text-sm uppercase font-semibold tracking-wide ${
                  currentPage === 'home' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                }`}
              >
                {t.nav.home}
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('shop');
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left rtl:text-right py-2 text-sm uppercase font-semibold tracking-wide ${
                  currentPage === 'shop' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                }`}
              >
                {t.nav.shop}
              </button>

              <div className="pt-2 border-t border-[var(--color-border)]">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                  {language === 'ar' ? 'استكشف المجموعات' : language === 'ru' ? 'Коллекции бутиков' : 'Explore Collections'}
                </span>
                {exploreItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.action();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left rtl:text-right py-1.5 text-xs text-[var(--color-text)] hover:text-[var(--color-primary)] flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-accent)] text-[var(--color-text)]">
                      {item.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* 4-Language Selector in Mobile Menu */}
              <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  {language === 'ar' ? 'اللغة' : language === 'ru' ? 'Язык' : language === 'fr' ? 'Langue' : 'Language'}
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`py-1.5 px-1.5 text-xs font-semibold rounded-md border text-center transition-all ${
                      language === 'en'
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)]'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ar')}
                    className={`py-1.5 px-1.5 text-xs font-semibold rounded-md border text-center transition-all ${
                      language === 'ar'
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)]'
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ru')}
                    className={`py-1.5 px-1.5 text-xs font-semibold rounded-md border text-center transition-all ${
                      language === 'ru'
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)]'
                    }`}
                  >
                    RU
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('fr')}
                    className={`py-1.5 px-1.5 text-xs font-semibold rounded-md border text-center transition-all ${
                      language === 'fr'
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)]'
                    }`}
                  >
                    FR
                  </button>
                </div>

                {isAdmin && (
                  <div className="pt-2 text-left rtl:text-right">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('admin');
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-[var(--color-primary)] font-semibold text-xs flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t.nav.admin}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
