import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Phone, Mail, Instagram, ShieldCheck, CreditCard } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-[var(--color-primary)] text-white pt-16 pb-12 border-t border-[var(--color-gold)]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[var(--color-gold)]/20">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <span className="font-heading text-2xl tracking-wider uppercase font-semibold text-white block">
              {t.storeName}
            </span>
            <p className="text-sm text-white/80 leading-relaxed max-w-sm">
              {t.footer.aboutText}
            </p>
            <div className="space-y-2 text-xs text-white/90 pt-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[var(--color-gold-light)] shrink-0 mt-0.5" />
                <span>{t.footer.boutiqueLocation}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[var(--color-gold-light)] shrink-0" />
                <span dir="ltr">{t.footer.phone} / {t.footer.whatsapp}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[var(--color-gold-light)] shrink-0" />
                <span>{t.footer.email}</span>
              </div>
            </div>
          </div>

          {/* Collections */}
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold tracking-wide text-white">
              {t.footer.shopLinks}
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <button onClick={() => onNavigate('shop', { category: 'cat-night-dresses' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {language === 'ar' ? 'فساتين النوم' : 'Night Dresses'}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'cat-pajama-sets' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {language === 'ar' ? 'أطقم البيجامات' : 'Pajama Sets'}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'cat-robes' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {language === 'ar' ? 'الأرواب الفاخرة' : 'Robes & Kimonos'}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { category: 'cat-silk-nightwear' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {language === 'ar' ? 'الحرير الطبيعي' : 'Pure Silk Collection'}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { filter: 'newArrival' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.nav.newArrivals}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { filter: 'sale' })} className="hover:text-[var(--color-gold-light)] transition-colors text-white font-medium">
                  {t.nav.sale}
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold tracking-wide text-white">
              {t.footer.customerCare}
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <button onClick={() => onNavigate('legal', { section: 'shipping' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.footer.shippingPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { section: 'refund' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.footer.refundPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account')} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.nav.account}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account', { tab: 'orders' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.orderConfirmation.trackOrder}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account', { tab: 'wishlist' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.nav.wishlist}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold tracking-wide text-white">
              {t.footer.legal}
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <button onClick={() => onNavigate('legal', { section: 'privacy' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.footer.privacyPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('legal', { section: 'terms' })} className="hover:text-[var(--color-gold-light)] transition-colors">
                  {t.footer.termsConditions}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-white transition-colors text-[var(--color-gold-light)]">
                  {t.nav.admin}
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Payments & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div>
            <p>{t.footer.allRightsReserved}</p>
          </div>

          {/* Payment Badges */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/60 hidden sm:inline">
              {t.footer.acceptedPayments}:
            </span>
            
            {/* Visa / Cash Badge */}
            <div className="bg-[#1434CB] text-white px-2.5 py-1 rounded text-[11px] font-black italic tracking-widest shadow-sm">
              CASH
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
