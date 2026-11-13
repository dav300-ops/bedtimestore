import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { MapPin, Phone, Mail, Instagram, ShieldCheck, CreditCard } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { categories, isLoadingCatalog } = useStore();

  const activeCategories = categories
    .filter((cat) => cat.active)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <footer className="bg-[var(--maroon-900)] text-[var(--text-on-maroon)] pt-16 pb-12 border-t border-[var(--gold-decor)]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[var(--gold-decor)]/25">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <span className="font-heading text-2xl tracking-wider uppercase font-semibold text-[var(--text-on-maroon)] block">
              {t.storeName}
            </span>
            <p className="text-sm text-[var(--surface-champagne)]/90 leading-relaxed max-w-sm">
              {t.footer.aboutText}
            </p>
            <div className="space-y-2 text-xs text-[var(--surface-champagne)] pt-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[var(--gold-decor)] shrink-0 mt-0.5" />
                <span>{t.footer.boutiqueLocation}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[var(--gold-decor)] shrink-0" />
                <span dir="ltr">{t.footer.phone} / {t.footer.whatsapp}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[var(--gold-decor)] shrink-0" />
                <span>{t.footer.email}</span>
              </div>
            </div>
          </div>

          {/* Collections (Dynamically fetched from database) */}
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold tracking-wide text-[var(--text-on-maroon)]">
              {t.footer.shopLinks}
            </h4>
            <ul className="space-y-2 text-xs text-[var(--surface-champagne)]/85">
              {isLoadingCatalog && activeCategories.length === 0 ? (
                <>
                  {[1, 2, 3, 4].map((n) => (
                    <li key={`cat-skel-${n}`} className="h-4 w-28 rounded bg-white/10 animate-pulse" />
                  ))}
                </>
              ) : (
                activeCategories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate('shop', { category: cat.id })}
                      className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer text-left rtl:text-right"
                    >
                      {language === 'ar' ? (cat.nameAr || cat.nameEn) : cat.nameEn}
                    </button>
                  </li>
                ))
              )}
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { filter: 'newArrival' })}
                  className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer"
                >
                  {t.nav.newArrivals}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', { filter: 'sale' })}
                  className="hover:text-[var(--gold-decor)] transition-colors text-[var(--text-on-maroon)] font-medium cursor-pointer"
                >
                  {t.nav.sale}
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold tracking-wide text-[var(--text-on-maroon)]">
              {t.footer.customerCare}
            </h4>
            <ul className="space-y-2 text-xs text-[var(--surface-champagne)]/85">
              <li>
                <button onClick={() => onNavigate('legal', { section: 'shipping' })} className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer">
                  {t.footer.shippingPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { section: 'refund' })} className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer">
                  {t.footer.refundPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account')} className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer">
                  {t.nav.account}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account', { tab: 'orders' })} className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer">
                  {t.orderConfirmation.trackOrder}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account', { tab: 'wishlist' })} className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer">
                  {t.nav.wishlist}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold tracking-wide text-[var(--text-on-maroon)]">
              {t.footer.legal}
            </h4>
            <ul className="space-y-2 text-xs text-[var(--surface-champagne)]/85">
              <li>
                <button onClick={() => onNavigate('legal', { section: 'privacy' })} className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer">
                  {t.footer.privacyPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { section: 'terms' })} className="hover:text-[var(--gold-decor)] transition-colors cursor-pointer">
                  {t.footer.termsConditions}
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Payments & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[var(--surface-champagne)]/80">
          <div>
            <p>{t.footer.allRightsReserved}</p>
          </div>

          {/* Payment Badges */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--surface-champagne)]/75 hidden sm:inline">
              {t.footer.acceptedPayments}:
            </span>
            
            {/* Tokenized Cash Badge */}
            <div className="bg-[var(--maroon-700)] text-[var(--surface-champagne)] border border-[var(--gold-decor)] px-2.5 py-1 rounded text-[11px] font-black italic tracking-widest shadow-sm">
              CASH
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
