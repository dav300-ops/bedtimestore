import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from './ProductCard';
import { Product, KidAgeRange } from '../types';
import { Sparkles, ShieldCheck, Heart, Ruler, ArrowRight, ArrowLeft, Check, Baby } from 'lucide-react';

interface KidsCollectionSectionProps {
  onNavigate: (page: string, params?: any) => void;
  onQuickView: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const KidsCollectionSection: React.FC<KidsCollectionSectionProps> = ({
  onNavigate,
  onQuickView,
  onSelectProduct,
}) => {
  const { products } = useStore();
  const { language, t, isRtl } = useLanguage();
  const [selectedAge, setSelectedAge] = useState<KidAgeRange | 'all'>('all');
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);

  const ageBrackets: { id: KidAgeRange | 'all'; labelEn: string; labelAr: string; range: string }[] = [
    { id: 'all', labelEn: 'All Ages', labelAr: 'جميع الأعمار', range: '3–12Y' },
    { id: '3-5', labelEn: 'Ages 3 to 5', labelAr: 'من ٣ إلى ٥ سنوات', range: '3–5 Years' },
    { id: '5-7', labelEn: 'Ages 5 to 7', labelAr: 'من ٥ إلى ٧ سنوات', range: '5–7 Years' },
    { id: '8-9', labelEn: 'Ages 8 to 9', labelAr: 'من ٨ إلى ٩ سنوات', range: '8–9 Years' },
    { id: '10-12', labelEn: 'Ages 10 to 12', labelAr: 'من ١٠ إلى ١٢ سنة', range: '10–12 Years' },
  ];

  const kidsProducts = products.filter(
    (p) => (p.isKids || p.categoryId === 'cat-kids-sleepwear' || p.tags.includes('Kids')) && p.active
  );

  const filteredKidsProducts = kidsProducts.filter((p) => {
    if (selectedAge === 'all') return true;
    return p.ageGroup === selectedAge;
  });

  const ageGuidelines: Record<KidAgeRange, { heightEn: string; heightAr: string; featureEn: string; featureAr: string }> = {
    '3-5': {
      heightEn: 'Approx. Height: 95 – 110 cm · Toddler Comfort Fit',
      heightAr: 'الطول التقريبي: ٩٥ – ١١٠ سم · مقاس مريح ومناسب للصغار',
      featureEn: 'Tagless collar, smooth covered elastic waistband & snap button closures.',
      featureAr: 'ياقة بدون ملصقات مزعجة، ومطاط قطني مغلف وأزرار كبس سهلة.',
    },
    '5-7': {
      heightEn: 'Approx. Height: 110 – 125 cm · Kindergarten & Early Primary',
      heightAr: 'الطول التقريبي: ١١٠ – ١٢٥ سم · للأعمار من الروضة إلى المرحلة الابتدائية الأولى',
      featureEn: 'Breathable thermoregulating sleep sets with durable mother-of-pearl buttons.',
      featureAr: 'أطقم نوم مسامية تنظم حرارة الجسم بأزرار صدفية ناعمة ومتينة.',
    },
    '8-9': {
      heightEn: 'Approx. Height: 125 – 138 cm · Growing Tween Comfort',
      heightAr: 'الطول التقريبي: ١٢٥ – ١٣٨ سم · راحة مثالية لمرحلة النمو والناشئين',
      featureEn: 'Classic piped notch collar sleepwear and airy morning silk kimonos.',
      featureAr: 'بيجامات كلاسيكية بحواف مطرزة وأرواب كيمونو حريرية فضفاضة.',
    },
    '10-12': {
      heightEn: 'Approx. Height: 138 – 155 cm · Pre-Teen Luxury Silhouettes',
      heightAr: 'الطول التقريبي: ١٣٨ – ١٥٥ سم · تصاميم راقية مصغرة تحاكي أناقة الكبار',
      featureEn: 'Grade-6A Mulberry silk & cooling bamboo modal with relaxed trousers.',
      featureAr: 'حرير التوت الطبيعي عيار ٢٢ موميه ومودال البامبو المنعش ببنطال مريح.',
    },
  };

  return (
    <section className="bg-[#FAF5F2] py-16 sm:py-20 border-y border-[#E1D1E4]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8E7C49]/15 text-[#8E7C49] rounded-full text-xs font-semibold uppercase tracking-wider">
            <Baby className="w-3.5 h-3.5" />
            <span>{t.kidsCollection.badge}</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#340404] tracking-tight">
            {t.kidsCollection.title}
          </h2>

          <p className="text-sm sm:text-base text-[#340404]/80 leading-relaxed font-light max-w-2xl mx-auto">
            {t.kidsCollection.subtitle}
          </p>

          {/* Fabric certification pill */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-[#8E7C49]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#8E7C49]" />
              {t.kidsCollection.safetyPledge}
            </span>
          </div>
        </div>

        {/* Age Filter Tabs & Size Guide Trigger */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-[#E1D1E4]/70">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {ageBrackets.map((bracket) => (
              <button
                key={bracket.id}
                onClick={() => setSelectedAge(bracket.id)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
                  selectedAge === bracket.id
                    ? 'bg-[#340404] text-[#FBE7E3] shadow-sm'
                    : 'bg-white text-[#340404] hover:bg-[#FBE7E3] border border-[#E1D1E4]'
                }`}
              >
                <span>{language === 'ar' ? bracket.labelAr : bracket.labelEn}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  selectedAge === bracket.id ? 'bg-white/20 text-white' : 'bg-[#8E7C49]/15 text-[#8E7C49]'
                }`}>
                  {bracket.range}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsSizeChartOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#8E7C49] hover:text-[#340404] font-medium underline underline-offset-4 py-1 transition-colors"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>{t.kidsCollection.sizeGuideTitle}</span>
          </button>
        </div>

        {/* Selected Age Highlight Banner */}
        {selectedAge !== 'all' && (
          <div className="bg-white p-4 sm:p-5 rounded-sm border border-[#E1D1E4] mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#E22001]/10 text-[#E22001] text-xs font-bold rounded-xs">
                  {language === 'ar' 
                    ? t.kidsCollection.ageRanges[selectedAge]
                    : t.kidsCollection.ageRanges[selectedAge]}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[#340404]">
                  {language === 'ar' ? ageGuidelines[selectedAge].heightAr : ageGuidelines[selectedAge].heightEn}
                </p>
              </div>
              <p className="text-xs text-[#340404]/75">
                {language === 'ar' 
                  ? t.kidsCollection.ageDescriptions[selectedAge] 
                  : t.kidsCollection.ageDescriptions[selectedAge]}
              </p>
            </div>

            <button
              onClick={() => onNavigate('shop', { category: 'cat-kids-sleepwear', ageGroup: selectedAge })}
              className="text-xs font-semibold uppercase tracking-wider text-[#E22001] hover:text-[#c01b01] inline-flex items-center gap-1 whitespace-nowrap self-start sm:self-center"
            >
              <span>{language === 'ar' ? 'عرض كافة المقاسات والألوان' : 'View All in this Age'}</span>
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredKidsProducts.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard
                product={product}
                onQuickView={onQuickView}
                onSelectProduct={onSelectProduct}
              />
              {/* Overlay Age Badge */}
              {product.ageGroup && (
                <div className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 z-10 pointer-events-none">
                  <span className="bg-[#340404]/90 backdrop-blur-xs text-[#FBE7E3] text-[10px] font-bold px-2 py-0.5 rounded-xs shadow-xs tracking-wide">
                    {language === 'ar'
                      ? t.kidsCollection.ageRanges[product.ageGroup]
                      : t.kidsCollection.ageRanges[product.ageGroup]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA & View Full Collection */}
        <div className="mt-12 text-center space-y-4">
          <button
            onClick={() => onNavigate('shop', { category: 'cat-kids-sleepwear', ageGroup: selectedAge !== 'all' ? selectedAge : undefined })}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#340404] hover:bg-[#E22001] text-[#FBE7E3] text-xs uppercase font-semibold tracking-widest rounded-xs transition-colors shadow-sm"
          >
            <span>{t.kidsCollection.viewAll}</span>
            {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
          <p className="text-xs text-[#340404]/70">
            {language === 'ar'
              ? 'تغليف هدايا فاخر متاح مع كل طلب لأعياد الميلاد والمناسبات الخاصة في البحرين'
              : 'Complimentary luxury gift wrapping with satin bows available on all kids bedtime orders.'}
          </p>
        </div>

      </div>

      {/* Children Size Guide Modal */}
      {isSizeChartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-sm border border-[#E1D1E4] max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E1D1E4] pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#8E7C49]" />
                <h3 className="font-heading text-lg font-semibold text-[#340404]">
                  {t.kidsCollection.sizeGuideTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsSizeChartOpen(false)}
                className="text-[#340404]/60 hover:text-[#340404] text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#340404]/80">
              {t.kidsCollection.sizeGuideDesc}
            </p>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right border border-[#E1D1E4]">
                <thead className="bg-[#FAF5F2] text-[#340404] font-semibold">
                  <tr>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'الفئة العمرية' : 'Age Bracket'}</th>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'المقاس الموصى به' : 'Size'}</th>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'طول الطفل (سم)' : 'Height (cm)'}</th>
                    <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'الوزن التقريبي (كغ)' : 'Weight (kg)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1D1E4] text-[#340404]/90">
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '٣ إلى ٥ سنوات' : '3 to 5 Years'}</td>
                    <td className="p-2.5 font-semibold">3-4Y / 4-5Y</td>
                    <td className="p-2.5">98 – 110 cm</td>
                    <td className="p-2.5">14 – 19 kg</td>
                  </tr>
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '٥ إلى ٧ سنوات' : '5 to 7 Years'}</td>
                    <td className="p-2.5 font-semibold">5-6Y / 6-7Y</td>
                    <td className="p-2.5">110 – 122 cm</td>
                    <td className="p-2.5">19 – 24 kg</td>
                  </tr>
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '٨ إلى ٩ سنوات' : '8 to 9 Years'}</td>
                    <td className="p-2.5 font-semibold">8-9Y</td>
                    <td className="p-2.5">125 – 135 cm</td>
                    <td className="p-2.5">25 – 32 kg</td>
                  </tr>
                  <tr className="hover:bg-[#FBE7E3]/30">
                    <td className="p-2.5 font-bold text-[#E22001]">{language === 'ar' ? '١٠ إلى ١٢ سنة' : '10 to 12 Years'}</td>
                    <td className="p-2.5 font-semibold">10-12Y</td>
                    <td className="p-2.5">138 – 152 cm</td>
                    <td className="p-2.5">33 – 45 kg</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#FAF5F2] p-3 rounded-xs text-[11px] text-[#340404]/80 space-y-1">
              <p className="font-semibold text-[#8E7C49]">
                {language === 'ar' ? 'نصيحة أخصائيي المقاسات في متجرنا:' : 'Atelier Fitting Tip:'}
              </p>
              <p>
                {language === 'ar'
                  ? 'إذا كان طفلك بين مقاسين، نوصي باختيار المقاس الأكبر لضمان حرية حركة مريحة ونوم عميق بدون قيود.'
                  : 'If your child is between sizes, we recommend sizing up for comfortable airflow and room to grow during peaceful sleep.'}
              </p>
            </div>

            <div className="text-right rtl:text-left pt-2">
              <button
                onClick={() => setIsSizeChartOpen(false)}
                className="px-5 py-2 bg-[#340404] text-white text-xs font-semibold rounded-xs hover:bg-[#E22001] transition-colors"
              >
                {language === 'ar' ? 'إغلاق الدليل' : 'Close Chart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
