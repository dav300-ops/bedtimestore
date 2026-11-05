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
      {/* 1. Announcement Bar */}
      <AnnouncementBar />

      {/* 2. Sticky Header (56px, Burgundy #6B0F1F, thin metallic gold hairline border) */}
      <header 
        className="sticky top-0 z-40 bg-[#6B0F1F] border-b border-[#C9A24B]/40 shadow-md transition-colors"
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[56px] w-full">
            
            {/* Left: Circular gold crest logo with "BTS" monogram + "BEDTIME STORE" */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-1.5 text-[#E3C878] hover:text-white transition-colors rounded-full border border-[#C9A24B]/50"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-left rtl:text-right group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B] rounded-md flex items-center gap-2.5"
              >
                {/* Circular gold crest logo with "BTS" monogram */}
                <div 
                  className="w-8 h-8 rounded-full border border-[#C9A24B] bg-gradient-to-br from-[#E3C878]/25 via-[#C9A24B]/15 to-[#A67C2E]/30 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                  title="Bedtime Store Crest"
                >
                  <svg className="w-4 h-4 text-[#E3C878]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeDasharray="1 2" strokeWidth="0.8" />
                    <text 
                      x="12" 
                      y="15.5" 
                      textAnchor="middle" 
                      fill="#E3C878" 
                      fontSize="8.5" 
                      fontFamily="'Cormorant Garamond', Georgia, serif" 
                      fontWeight="bold"
                      letterSpacing="0.5"
                    >
                      BTS
                    </text>
                  </svg>
                </div>

                {/* "Deluxe Bedtime Store" in gold uppercase serif with wide letter-spacing */}
                <span 
                  className="font-serif text-sm sm:text-base font-semibold tracking-[0.22em] uppercase text-[#E3C878] group-hover:text-white transition-colors select-none leading-none pt-0.5"
                  style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif' }}
                >
                  DELUXE BEDTIME STORE
                </span>
              </button>
            </div>

            {/* Center-left navigation: HOME (active, gold underline), SHOP, EXPLORE */}
            <nav className="hidden lg:flex items-center gap-7 ml-8 rtl:ml-0 rtl:mr-8 mr-auto">
              {/* HOME link (active, gold underline) */}
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B] rounded-xs ${
                  currentPage === 'home'
                    ? 'text-[#E3C878] after:content-[""] after:absolute after:-bottom-[2px] after:left-0 after:right-0 after:h-[1.5px] after:bg-[#C9A24B]'
                    : 'text-[#FBF4E4]/90 hover:text-[#E3C878]'
                }`}
              >
                {t.nav.home}
              </button>

              {/* SHOP link */}
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B] rounded-xs ${
                  currentPage === 'shop'
                    ? 'text-[#E3C878] after:content-[""] after:absolute after:-bottom-[2px] after:left-0 after:right-0 after:h-[1.5px] after:bg-[#C9A24B]'
                    : 'text-[#FBF4E4]/90 hover:text-[#E3C878]'
                }`}
              >
                {t.nav.shop}
              </button>

              {/* EXPLORE with small chevron dropdown */}
              <div className="relative" ref={exploreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExploreOpen(!isExploreOpen)}
                  aria-expanded={isExploreOpen}
                  aria-haspopup="true"
                  className={`text-[12px] font-semibold tracking-[0.16em] uppercase py-1 cursor-pointer transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B] rounded-xs ${
                    isExploreOpen || isExploreActive
                      ? 'text-[#E3C878]'
                      : 'text-[#FBF4E4]/90 hover:text-[#E3C878]'
                  }`}
                >
                  <span>{language === 'ar' ? 'استكشف' : 'EXPLORE'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#E3C878] transition-transform duration-200 ${isExploreOpen ? 'rotate-180' : ''}`} />
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

            {/* Zone 3: Right side in exact order: Search, Reem pill, Heart (2), BAG button, Language pill, Shield */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              
              {/* 1. Gold search icon */}
              <div className="relative">
                {isSearchOpen ? (
                  <form onSubmit={handleSearchSubmit} className="flex items-center">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={language === 'ar' ? 'بحث في المتجر...' : language === 'ru' ? 'Поиск в бутике...' : 'Search sleepwear...'}
                      className="w-32 sm:w-48 px-2.5 py-1 text-xs bg-white text-[#3B2A24] border border-[#C9A24B] rounded-full focus:outline-none focus:ring-1 focus:ring-[#C9A24B]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="p-1 text-[#E3C878] hover:text-white"
                      aria-label="Close search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="p-1.5 text-[#E3C878] hover:text-white transition-colors rounded-full border border-[#C9A24B]/60 hover:border-[#E3C878] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
                    aria-label="Search"
                    title="Search"
                  >
                    <Search className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                )}
              </div>

              {/* 2. Pill button with gold outline + user avatar icon reading "Reem" */}
              <button
                type="button"
                onClick={() => currentUser && !currentUser.isGuest ? onNavigate('account') : openAuthModal('signin')}
                className="flex items-center gap-1.5 py-1 px-3 rounded-full border border-[#C9A24B] hover:border-[#E3C878] bg-[#4A0A15]/40 hover:bg-[#4A0A15]/80 transition-all text-xs text-[#FBF4E4] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
                title={currentUser?.firstName ? `${currentUser.firstName} (${t.nav.account})` : "Reem (Account)"}
              >
                <div className="w-4 h-4 rounded-full bg-[#C9A24B] text-[#4A0A15] flex items-center justify-center font-bold text-[9px] shrink-0">
                  <User className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span className="font-medium text-[11px] tracking-wide">
                  {currentUser && !currentUser.isGuest ? currentUser.firstName : 'Reem'}
                </span>
              </button>

              {/* 3. Heart icon with small gold notification badge showing "2" */}
              <button
                type="button"
                onClick={() => onNavigate('account', { tab: 'wishlist' })}
                className="p-1.5 text-[#E3C878] hover:text-white transition-colors relative rounded-full border border-[#C9A24B]/60 hover:border-[#E3C878] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
                aria-label="Wishlist"
                title={t.nav.wishlist}
              >
                <Heart className="w-3.5 h-3.5 stroke-[2]" />
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] text-[9px] flex items-center justify-center bg-[#C9A24B] text-[#4A0A15] font-bold rounded-full px-0.5 shadow-xs">
                  {currentUser?.wishlist && currentUser.wishlist.length > 0 ? currentUser.wishlist.length : '2'}
                </span>
              </button>

              {/* 4. Rounded-rectangle outlined "BAG" button with bag icon */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-1.5 py-1 px-2.5 border border-[#C9A24B] hover:border-[#E3C878] bg-[#4A0A15]/40 hover:bg-[#4A0A15]/80 text-[#FBF4E4] rounded-lg transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24B]"
                aria-label={`Bag with ${cartCount} items`}
              >
                <div className="relative">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#E3C878] stroke-[2]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#E3C878] text-[#4A0A15] text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center tabular-nums">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  {language === 'ar' ? 'الحقيبة' : language === 'ru' ? 'Корзина' : language === 'fr' ? 'Panier' : 'BAG'}
                </span>
              </button>

              {/* 5. Language switcher pill with "EN" highlighted in solid gold fill and "العربية  RU  FR" beside it */}
              <div className="hidden sm:flex items-center border border-[#C9A24B] rounded-full p-0.5 bg-[#4A0A15]/50 shadow-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-[#C9A24B] text-[#4A0A15] shadow-xs font-black'
                      : 'text-[#FBF4E4]/80 hover:text-[#E3C878]'
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
                      ? 'bg-[#C9A24B] text-[#4A0A15] shadow-xs font-black'
                      : 'text-[#FBF4E4]/80 hover:text-[#E3C878]'
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
                      ? 'bg-[#C9A24B] text-[#4A0A15] shadow-xs font-black'
                      : 'text-[#FBF4E4]/80 hover:text-[#E3C878]'
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
                      ? 'bg-[#C9A24B] text-[#4A0A15] shadow-xs font-black'
                      : 'text-[#FBF4E4]/80 hover:text-[#E3C878]'
                  }`}
                  title="Français"
                >
                  FR
                </button>
              </div>

              {/* 6. Small gold shield or security icon at the far right */}
              <button
                type="button"
                onClick={() => isAdmin ? onNavigate('admin') : onNavigate('home')}
                className="p-1.5 text-[#E3C878] hover:text-white rounded-full border border-[#C9A24B]/60 hover:border-[#E3C878] transition-colors cursor-pointer"
                title={isAdmin ? "Admin Dashboard" : "Verified Luxury Sleepwear · Kingdom of Bahrain"}
                aria-label="Security guarantee"
              >
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
              </button>

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
