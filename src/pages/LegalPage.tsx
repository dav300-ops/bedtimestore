import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Shield, FileText, Truck, RefreshCw, Cookie } from 'lucide-react';

interface LegalPageProps {
  initialSection?: 'privacy' | 'terms' | 'refund' | 'shipping' | 'cookie';
  onReturnToStore: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  initialSection = 'shipping',
  onReturnToStore,
}) => {
  const { language, t } = useLanguage();
  const [activeSection, setActiveSection] = useState(initialSection);

  return (
    <div className="bg-[#FBE7E3] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#8E7C49]">
            {language === 'ar' ? 'مملكة البحرين · الشفافية والأمان' : 'Kingdom of Bahrain · Transparency'}
          </span>
          <h1 className="font-heading text-3xl font-semibold text-[#340404]">
            {language === 'ar' ? 'السياسات والشروط الرسمية' : 'Store Policies & Terms'}
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E1D1E4] mb-8 overflow-x-auto gap-2">
          {[
            { id: 'shipping', label: t.footer.shippingPolicy, icon: Truck },
            { id: 'refund', label: t.footer.refundPolicy, icon: RefreshCw },
            { id: 'privacy', label: t.footer.privacyPolicy, icon: Shield },
            { id: 'terms', label: t.footer.termsConditions, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`py-3 px-5 text-xs font-semibold uppercase tracking-wider rounded-t-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-[#E22001] border-t-2 border-[#E22001] shadow-xs font-bold'
                    : 'bg-[#E1D1E4]/50 text-[#340404] hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="bg-white p-8 sm:p-12 rounded-sm border border-[#E1D1E4] shadow-xs text-xs sm:text-sm text-[#340404]/80 leading-relaxed space-y-6">
          
          {activeSection === 'shipping' && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold text-[#340404]">
                {language === 'ar' ? 'سياسة الشحن والتوصيل في مملكة البحرين' : 'Bahrain Shipping Policy'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'يقوم ذا بدتايم ستور (THE BEDTIME STORE) بتوصيل جميع الطلبات الفاخرة لكافة مناطق مملكة البحرين عبر أسطول سيارات مجهز ومكيف لضمان وصول حرير وأقمشة ملابس النوم بأعلى معايير النظافة والجودة.'
                  : 'THE BEDTIME STORE delivers luxury nightwear to all governorates and areas in the Kingdom of Bahrain using climate-controlled courier vehicles to maintain the delicate drape and pristine finish of pure silk.'}
              </p>
              <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 space-y-2">
                <li><strong>{language === 'ar' ? 'التوصيل العادي:' : 'Standard Delivery:'}</strong> {language === 'ar' ? 'خلال ٢٤ إلى ٤٨ ساعة بقيمة ١.٥٠٠ د.ب لجميع مناطق البحرين.' : 'Within 24-48 hours at a flat rate of 1.500 BHD.'}</li>
                <li><strong>{language === 'ar' ? 'التوصيل المجاني:' : 'Complimentary Delivery:'}</strong> {language === 'ar' ? 'توصيل مجاني بالكامل للطلبات التي تتجاوز قيمتها ٢٥.٠٠٠ د.ب.' : 'Free standard delivery on all orders exceeding 25.000 BHD.'}</li>
                <li><strong>{language === 'ar' ? 'التوصيل السريع (في نفس اليوم):' : 'Same-Day Express:'}</strong> {language === 'ar' ? 'للطلبات المقدمة قبل الساعة ٢ ظهرًا بقيمة ٢.٥٠٠ د.ب.' : 'For orders confirmed before 2:00 PM at 2.500 BHD.'}</li>
              </ul>
            </div>
          )}

          {activeSection === 'refund' && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold text-[#340404]">
                {language === 'ar' ? 'سياسة الاستبدال والاسترجاع' : 'Refund & Returns Policy'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'وفقاً لقوانين وزارة الصناعة والتجارة بمملكة البحرين ومعايير النظافة الصارمة للملابس الشخصية، يحق لعميلاتنا طلب استبدال أو استرجاع القطع غير المستخدمة خلال ٧ أيام من تاريخ الاستلام.'
                  : 'In compliance with Ministry of Industry and Commerce regulations in the Kingdom of Bahrain, items may be returned or exchanged within 7 days of delivery.'}
              </p>
              <p>
                {language === 'ar'
                  ? 'يجب أن تكون القطع في حالتها الأصلية مع بطاقات السعر والتغليف الفاخر وبدون أي أثر للاستخدام أو العطور.'
                  : 'All garments must be returned unworn, unwashed, in original luxury gift packaging with all boutique tags intact.'}
              </p>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold text-[#340404]">
                {language === 'ar' ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & Data Protection'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'نحن نلتزم بحماية خصوصية بيانات عميلاتنا في مملكة البحرين. لا نقوم بتخزين أو مشاركة أرقام البطاقات الائتمانية أو تفاصيل الحسابات البنكية. تتم جميع عمليات الدفع عبر بنفت بي أو منصة الدفع المعتمدة بتشفير ٢٥٦ بت.'
                  : 'We strictly protect customer personal details under the Bahrain Personal Data Protection Law (PDPL). We never store raw payment card data on our servers. All transactions are securely routed through BenefitPay or certified PCI-DSS gateways.'}
              </p>
            </div>
          )}

          {activeSection === 'terms' && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold text-[#340404]">
                {language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'مرحبًا بكم في متجر ذا بدتايم ستور. تم تسجيل المتجر كمؤسسة تجارية مرخصة في مملكة البحرين. الأسعار المعروضة بالدينار البحريني (BHD) وتشمل الضرائب المطبقة.'
                  : 'Welcome to THE BEDTIME STORE. All prices are listed in Bahraini Dinars (BHD). By using this site, you agree to comply with all terms and applicable laws of the Kingdom of Bahrain.'}
              </p>
            </div>
          )}

          <div className="pt-6 border-t border-[#E1D1E4]">
            <button
              onClick={onReturnToStore}
              className="px-6 py-2.5 bg-[#E22001] text-white text-xs font-semibold uppercase tracking-wider rounded-xs hover:bg-[#c01b01] transition-colors"
            >
              {language === 'ar' ? 'العودة للتسوق' : 'Return to Boutique'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
