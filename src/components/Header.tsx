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
import { useStore } from '../context/StoreContext';
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
  const { cms } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Desktop Hamburger Menu State & Ref for Click-Outside / Escape
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node)) {
        setIsDesktopMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDesktopMenuOpen(false);
      }
    };

    if (isDesktopMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDesktopMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('shop', { search: searchQuery.trim() });
      setIsSearchOpen(false);
    }
  };

interface NavItem {
  id: string;
  label: string;
  category?: string;
  filter?: string;
  badge?: string;
}

  // Primary navigation links visible directly on the desktop navbar
  const primaryNavItems: NavItem[] = [
    { id: 'home', label: t.nav.home },
    { id: 'shop', label: t.nav.shop },
    
  ];

  // Highlights curated into the desktop hamburger menu to conserve space
  const desktopHamburgerItems = [
    {
      id: 'album',
      label: (t.nav as any).album || (language === 'ar' ? 'ألبوم الصور' : 'Lookbook Album'),
      subtitle: language === 'ar' ? 'جلسات تصوير وتنسيقات ملابس النوم الفاخرة' : 'Curated styling & editorial photo sessions',
      badge: language === 'ar' ? 'معرض الصور' : 'Visual Gallery',
      badgeColor: 'bg-[#8E7C49]/15 text-[#8E7C49] border border-[#8E7C49]/30',
      icon: BookOpen,
      iconBg: 'bg-[#340404]/5 text-[#340404] group-hover:bg-[#340404] group-hover:text-[#FBE7E3]',
      action: () => onNavigate('album'),
      isActive: currentPage === 'album',
    },
    {
      id: 'best-sellers',
      label: t.nav.bestSellers,
      subtitle: language === 'ar' ? 'القطع الأكثر طلباً وإعجاباً في البحرين' : 'Most-loved luxury silk & satin essentials',
      badge: language === 'ar' ? 'الأكثر طلباً' : 'Top Rated',
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
      icon: Flame,
      iconBg: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
      action: () => onNavigate('shop', { filter: 'bestSeller' }),
      isActive: currentPage === 'shop' && currentParams?.filter === 'bestSeller',
    },
    {
      id: 'sale',
      label: t.nav.sale,
      subtitle: language === 'ar' ? 'تخفيضات وعروض حصرية على أطقم ملابس النوم' : 'Exclusive seasonal promotions & special pricing',
      badge: language === 'ar' ? 'عروض خاصة' : 'Special Offers',
      badgeColor: 'bg-rose-100 text-[#E22001] border border-rose-200',
      icon: Tag,
      iconBg: 'bg-rose-50 text-[#E22001] group-hover:bg-[#E22001] group-hover:text-white',
      action: () => onNavigate('shop', { filter: 'sale' }),
      isActive: currentPage === 'shop' && currentParams?.filter === 'sale',
    },
  ];

  const isHamburgerActive = desktopHamburgerItems.some((item) => item.isActive);

  // All navigation items for mobile drawer
  const mobileNavItems: NavItem[] = [
    ...primaryNavItems,
    { id: 'album', label: (t.nav as any).album || (language === 'ar' ? 'ألبوم الصور' : 'Lookbook Album') },
    { id: 'best-sellers', label: t.nav.bestSellers, filter: 'bestSeller' },
    { id: 'sale', label: t.nav.sale, filter: 'sale' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBE7E3] border-b border-[#E1D1E4] transition-colors">
      {/* Announcement Bar */}
      <div className="bg-[#340404] text-[#FBE7E3] py-2 px-4 sm:px-6 lg:px-8 xl:px-12 text-xs font-medium text-center tracking-wide">
        <div className="w-full flex items-center justify-between">
          <span className="hidden sm:inline text-[#8E7C49]">
            {language === 'ar' ? 'البحرين والخليج العربي' : 'Kingdom of Bahrain'}
          </span>
          <span className="mx-auto truncate px-2">
            {t.announcement}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Admin Toggle / Portal Access */}
            <button
              onClick={() => onNavigate('admin')}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${
                isAdmin 
                  ? 'text-[#E1D1E4] hover:text-white underline font-semibold' 
                  : 'text-[#FBE7E3]/80 hover:text-white bg-white/10'
              }`}
              title="Admin Portal (Verify POD & Manage Orders)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#E22001]" />
              <span>{isAdmin ? t.nav.admin : (language === 'ar' ? 'الإدارة (تجريبي)' : 'Admin Portal')}</span>
            </button>
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1 text-xs text-[#FBE7E3] hover:text-white px-2 py-0.5 rounded transition-colors"
              title="Toggle English / Arabic"
            >
              <Globe className="w-3.5 h-3.5 text-[#8E7C49]" />
              <span className="font-semibold">{language === 'en' ? 'العربية' : 'EN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - Full Width Desktop Layout Pushing Logo to Far Left */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between h-20 w-full">
          
          {/* Zone 1: Brand Wordmark (Anchored to Far Left on Desktop) */}
          <div className="flex items-center gap-3 shrink-0 justify-start">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-[#340404] hover:text-[#E22001] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 sm:gap-3 text-left rtl:text-right group cursor-pointer"
            >
              {/* Boutique Logo Picture Element */}
              <div className="relative shrink-0">
                <img
                  src={cms?.logoPicUrl || boutiqueLogo}
                  alt="The Bedtime Store Logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full shadow-xs border border-[#8E7C49]/40 group-hover:scale-105 transition-transform duration-200 bg-[#340404]"
                />
              </div>

              <div className="flex flex-col">
                <span className="font-heading text-lg sm:text-2xl lg:text-3xl tracking-tight text-[#340404] font-semibold group-hover:text-[#E22001] transition-colors uppercase leading-none">
                  {t.storeName}
                </span>
                <span className="text-[9px] sm:text-[10px] tracking-widest text-[#8E7C49] font-medium uppercase mt-0.5 hidden xs:inline">
                  {language === 'ar' ? 'بوتيك ملابس النوم الفاخرة · البحرين' : 'Luxury Sleepwear Boutique · Bahrain'}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links & Desktop Hamburger Menu (Optimized for generous breathing space) */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-7 mx-auto px-2">
            {primaryNavItems.map((item) => {
              const isActive = 
                item.filter ? (currentPage === 'shop' && currentParams?.filter === item.filter)
                : item.category ? (currentPage === 'shop' && currentParams?.category === item.category)
                : currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.category) {
                      onNavigate('shop', { category: item.category });
                    } else if (item.filter) {
                      onNavigate('shop', { filter: item.filter });
                    } else if (item.id === 'categories') {
                      onNavigate('shop', { viewCategories: true });
                    } else {
                      onNavigate(item.id);
                    }
                  }}
                  className={`text-sm tracking-wide transition-colors uppercase font-medium whitespace-nowrap py-1 relative inline-flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-[#E22001] font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#E22001]'
                      : 'text-[#340404] hover:text-[#E22001]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#8E7C49]/15 text-[#8E7C49] rounded-full normal-case">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Desktop Hamburger Menu Trigger: Lookbook Album, Best Sellers & Sale */}
            <div className="relative" ref={desktopMenuRef}>
              <button
                type="button"
                onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
                aria-expanded={isDesktopMenuOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 py-1.5 px-3 rounded-full border transition-all text-xs uppercase font-semibold tracking-wider cursor-pointer shadow-2xs select-none ${
                  isDesktopMenuOpen || isHamburgerActive
                    ? 'border-[#8E7C49] bg-[#340404] text-[#FBE7E3] shadow-xs'
                    : 'border-[#E1D1E4] hover:border-[#8E7C49] bg-white/80 hover:bg-white text-[#340404] hover:text-[#E22001]'
                }`}
                title={language === 'ar' ? 'ألبوم الصور، الأكثر مبيعاً، التخفيضات' : 'Discover: Lookbook, Best Sellers & Sale'}
              >
                {/* Sleek 3-bar hamburger icon */}
                <div className="flex flex-col justify-center items-center gap-[3px] w-3.5 h-3.5 shrink-0">
                  <span className={`block h-[1.5px] w-3.5 rounded-full transition-colors ${
                    isDesktopMenuOpen || isHamburgerActive ? 'bg-[#FBE7E3]' : 'bg-[#340404]'
                  }`} />
                  <span className={`block h-[1.5px] w-2.5 rounded-full transition-colors self-start ${
                    isDesktopMenuOpen || isHamburgerActive ? 'bg-[#8E7C49]' : 'bg-[#8E7C49]'
                  }`} />
                  <span className={`block h-[1.5px] w-3.5 rounded-full transition-colors ${
                    isDesktopMenuOpen || isHamburgerActive ? 'bg-[#FBE7E3]' : 'bg-[#340404]'
                  }`} />
                </div>

                <span>{language === 'ar' ? 'المجموعات' : 'Explore'}</span>

                {isHamburgerActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E22001]" title="Active section" />
                )}

                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                  isDesktopMenuOpen ? 'rotate-180' : ''
                } ${isDesktopMenuOpen || isHamburgerActive ? 'text-[#8E7C49]' : 'text-[#8E7C49]'}`} />
              </button>

              {/* Desktop Dropdown Flyout Panel */}
              {isDesktopMenuOpen && (
                <div
                  className={`absolute top-full mt-2.5 z-50 w-88 bg-white rounded-md border border-[#E1D1E4] shadow-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-150 ${
                    isRtl ? 'left-0 text-right' : 'right-0 text-left'
                  }`}
                  style={{ minWidth: '340px' }}
                >
                  {/* Dropdown Header */}
                  <div className="px-3 py-2 border-b border-[#E1D1E4]/70 mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E7C49] block">
                        {language === 'ar' ? 'مختارات مميزة' : 'Curated Highlights'}
                      </span>
                      <h4 className="font-heading text-sm font-bold text-[#340404]">
                        {language === 'ar' ? 'ألبوم الإطلالات والعروض' : 'Lookbook & Highlights'}
                      </h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FBE7E3] text-[#340404] font-semibold border border-[#8E7C49]/30">
                      3 {language === 'ar' ? 'أقسام' : 'Collections'}
                    </span>
                  </div>

                  {/* Curated Menu Items: Lookbook Album, Best Sellers, Sale */}
                  <div className="space-y-1.5">
                    {desktopHamburgerItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            item.action();
                            setIsDesktopMenuOpen(false);
                          }}
                          className={`w-full group p-2.5 rounded-sm transition-all text-left rtl:text-right flex items-start gap-3 cursor-pointer ${
                            item.isActive
                              ? 'bg-[#FBE7E3] border border-[#8E7C49]/50 shadow-2xs'
                              : 'hover:bg-[#FBE7E3]/60 border border-transparent hover:border-[#E1D1E4]'
                          }`}
                        >
                          <div className={`p-2.5 rounded-sm shrink-0 transition-colors ${item.iconBg}`}>
                            <IconComponent className="w-4 h-4 stroke-[2]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-xs font-bold uppercase tracking-wider ${
                                item.isActive ? 'text-[#E22001]' : 'text-[#340404] group-hover:text-[#E22001]'
                              }`}>
                                {item.label}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${item.badgeColor}`}>
                                {item.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#340404]/70 leading-relaxed mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>

                          <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isRtl ? (
                              <ArrowLeft className="w-3.5 h-3.5 text-[#E22001]" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5 text-[#E22001]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Footer Notice */}
                  <div className="mt-2.5 pt-2 border-t border-[#E1D1E4]/70 px-2 flex items-center justify-between text-[10px] text-[#340404]/70">
                    <span className="flex items-center gap-1 text-[#8E7C49]">
                      <Sparkles className="w-3 h-3" />
                      <span>{language === 'ar' ? 'توصيل مجاني للطلبات فوق 25 د.ب' : 'Free delivery on 25+ BHD orders'}</span>
                    </span>
                    <span className="font-semibold text-[#340404] font-heading">The Bedtime Store</span>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Zone 3: Primary Utility Actions (Anchored to Far Right on Desktop) */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-end">
            {/* Search Trigger */}
            <div className="relative">
              {isSearchOpen ? (
                <form onSubmit={handleSearchSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحثي عن حرير، ساتان، بيجامة...' : 'Search silk, satin, robes...'}
                    autoFocus
                    className="w-44 sm:w-60 px-3 py-1.5 text-xs bg-white text-[#340404] border border-[#E1D1E4] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#E22001]"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="p-1 text-[#340404] hover:text-[#E22001]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-[#340404] hover:text-[#E22001] transition-colors"
                  aria-label="Search Catalog"
                  title="Search"
                >
                  <Search className="w-5 h-5 stroke-[1.75]" />
                </button>
              )}
            </div>

            {/* Customer Account / Sign In */}
            {currentUser && !currentUser.isGuest ? (
              <button
                onClick={() => onNavigate('account')}
                className="flex items-center gap-2 p-1 pl-2 rtl:pl-1 rtl:pr-2 rounded-full border border-[#E1D1E4] hover:border-[#8E7C49] bg-white transition-all text-xs text-[#340404] cursor-pointer"
                title={`${currentUser.firstName} (${t.nav.account})`}
              >
                <span className="hidden sm:inline font-semibold text-[11px] max-w-[80px] truncate">
                  {currentUser.firstName}
                </span>
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.firstName}
                    className="w-6 h-6 rounded-full object-cover border border-[#8E7C49]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#340404] text-[#FBE7E3] flex items-center justify-center font-bold text-[10px]">
                    {currentUser.firstName.charAt(0)}
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('signin')}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-white border border-[#E1D1E4] hover:border-[#E22001] text-[#340404] hover:text-[#E22001] rounded-xs text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                aria-label="Sign In"
                title={t.account.signIn}
              >
                <User className="w-3.5 h-3.5 text-[#8E7C49]" />
                <span className="hidden sm:inline">
                  {currentUser?.isGuest ? (language === 'ar' ? 'زائر | دخول' : 'Guest | Sign In') : t.account.signIn}
                </span>
                <span className="sm:hidden text-[10px]">
                  {currentUser?.isGuest ? (language === 'ar' ? 'زائر' : 'Guest') : t.account.signIn}
                </span>
              </button>
            )}

            {/* Wishlist */}
            <button
              onClick={() => onNavigate('account', { tab: 'wishlist' })}
              className="p-2 text-[#340404] hover:text-[#E22001] transition-colors relative"
              aria-label="Wishlist"
              title={t.nav.wishlist}
            >
              <Heart className="w-5 h-5 stroke-[1.75]" />
              {currentUser && currentUser.wishlist.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 text-[10px] flex items-center justify-center bg-[#8E7C49] text-white rounded-full px-1">
                  {currentUser.wishlist.length}
                </span>
              )}
            </button>

            {/* Shopping Cart Drawer Toggle */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 p-2 bg-white/70 hover:bg-white text-[#340404] hover:text-[#E22001] border border-[#E1D1E4] rounded-sm transition-all"
              aria-label="Shopping Cart"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#E22001] text-white text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-semibold tracking-wider uppercase text-[#340404]">
                {t.nav.cart}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#FBE7E3] border-b border-[#E1D1E4] px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            {mobileNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.category) {
                    onNavigate('shop', { category: item.category });
                  } else if (item.filter) {
                    onNavigate('shop', { filter: item.filter });
                  } else if (item.id === 'categories') {
                    onNavigate('shop', { viewCategories: true });
                  } else {
                    onNavigate(item.id);
                  }
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left rtl:text-right py-2 text-base uppercase font-medium tracking-wide flex items-center justify-between ${
                  currentPage === item.id ? 'text-[#E22001] font-bold' : 'text-[#340404]'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#8E7C49]/15 text-[#8E7C49] rounded-full normal-case">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
            <div className="pt-3 border-t border-[#E1D1E4] flex items-center justify-between">
              <button
                onClick={() => {
                  onNavigate('account');
                  setIsMobileMenuOpen(false);
                }}
                className="text-sm text-[#340404] hover:text-[#E22001] flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {currentUser && !currentUser.isGuest
                  ? `${currentUser.firstName} (${t.nav.account})`
                  : (language === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Guest | Sign In')}
              </button>
              <button
                onClick={() => {
                  onNavigate('admin');
                  setIsMobileMenuOpen(false);
                }}
                className={`text-sm font-semibold flex items-center gap-1 ${
                  isAdmin ? 'text-[#E22001]' : 'text-[#8E7C49]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdmin ? t.nav.admin : (language === 'ar' ? 'لوحة الإدارة' : 'Admin Portal')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
