import React, { useState } from 'react';
import { Product, ProductSize } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { ProductAlbumModal } from '../components/ProductAlbumModal';
import { 
  Heart, 
  ShoppingBag, 
  Check, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Share2, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Ruler,
  Baby,
  Layers,
  Package,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  Images,
  Maximize2
} from 'lucide-react';

interface ProductDetailPageProps {
  product: Product;
  onNavigateCheckout: () => void;
  onSelectProduct: (p: Product) => void;
  onQuickView: (p: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product: initialProduct,
  onNavigateCheckout,
  onSelectProduct,
  onQuickView,
}) => {
  const { language, formatBHD, t, isRtl } = useLanguage();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useAuth();
  const { products } = useStore();

  // Keep synced with live dynamic database state
  const product = products.find((p) => p.id === initialProduct.id) || initialProduct;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [selectedSize, setSelectedSize] = useState<ProductSize>(
    product.variants[0]?.size || 'S'
  );

  // Group unique colors with aggregate live stock balance
  const uniqueColors = Array.from(
    new Map(
      product.variants.map((v) => {
        const colorStock = product.variants
          .filter((sub) => sub.colorHex.toLowerCase() === v.colorHex.toLowerCase())
          .reduce((sum, sub) => sum + (Number(sub.stock) || 0), 0);

        return [
          v.colorHex.toLowerCase(),
          {
            hex: v.colorHex,
            nameEn: v.colorNameEn,
            nameAr: v.colorNameAr,
            totalStock: colorStock,
          },
        ];
      })
    ).values()
  );

  const [selectedColor, setSelectedColor] = useState(
    uniqueColors[0] || { hex: '#000', nameEn: 'Standard', nameAr: 'افتراضي', totalStock: 0 }
  );

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'care' | 'shipping' | 'varieties'>('details');
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);
  const [isKidsSizeModalOpen, setIsKidsSizeModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);

  const displayName = language === 'ar' ? product.nameAr : product.nameEn;
  const displayDesc = language === 'ar' ? product.descriptionAr : product.descriptionEn;
  const displayMaterial = language === 'ar' ? product.materialAr : product.materialEn;
  const displayCare = language === 'ar' ? product.careInstructionsAr : product.careInstructionsEn;
  const isWishlisted = isInWishlist(product.id);

  // Total stock across all varieties for this product
  const totalProductStock = (product.variants || []).reduce(
    (sum, v) => sum + (Number(v.stock) || 0),
    0
  );

  // Active selected variant stock
  const currentVariant = product.variants.find(
    (v) =>
      v.size === selectedSize &&
      (v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase() ||
        v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase())
  );

  const availableStock = currentVariant ? currentVariant.stock : 0;
  const isOutOfStock = availableStock === 0;
  const isLowStock = availableStock > 0 && availableStock <= 4;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const res = addToCart(
      product,
      selectedSize,
      language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn,
      selectedColor.hex,
      quantity
    );
    if (res.success) {
      setIsAddedFeedback(true);
      setTimeout(() => setIsAddedFeedback(false), 1500);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(
      product,
      selectedSize,
      language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn,
      selectedColor.hex,
      quantity
    );
    onNavigateCheckout();
  };

  // Related products
  const related = products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);

  return (
    <div className="bg-[#FBE7E3] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[#340404]/70 mb-8 uppercase tracking-wider">
          <span className="hover:text-[#340404] cursor-pointer">
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </span>
          <span>/</span>
          <span className="hover:text-[#340404] cursor-pointer">
            {language === 'ar' ? product.categoryNameAr : product.categoryNameEn}
          </span>
          <span>/</span>
          <span className="text-[#340404] font-semibold truncate max-w-xs">{displayName}</span>
        </nav>

        {/* Main PDP Grid (Contiguous Purchase Module on Right, Gallery on Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-6 sm:p-10 rounded-sm border border-[#E1D1E4] shadow-xs">
          
          {/* Left Column: Image Gallery with Interactive Zoom */}
          <div className="lg:col-span-7 space-y-4">
            <div
              className="relative aspect-[3/4] bg-white rounded-sm overflow-hidden border border-[#E1D1E4]/60 cursor-crosshair"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <img
                src={product.images[activeImageIndex] || product.images[0]}
                alt={displayName}
                className={`w-full h-full object-cover object-center transition-transform duration-200 ${
                  isZoomed ? 'scale-150 origin-center' : 'scale-100'
                }`}
                style={
                  isZoomed
                    ? {
                        transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      }
                    : undefined
                }
                referrerPolicy="no-referrer"
              />

              {/* Badges */}
              <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 flex flex-col gap-1.5 z-10">
                {product.salePrice && product.salePrice < product.price && (
                  <span className="bg-[#E22001] text-white text-[11px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-xs shadow-sm">
                    {language === 'ar' ? 'تخفيض' : 'Sale'}
                  </span>
                )}
                {product.newArrival && (
                  <span className="bg-[#8E7C49] text-white text-[11px] font-semibold px-2.5 py-1 uppercase tracking-wider rounded-xs shadow-sm">
                    {t.product.new}
                  </span>
                )}
                {product.ageGroup && (
                  <span className="bg-[#340404] text-[#FBE7E3] text-[11px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-xs shadow-sm">
                    {language === 'ar' ? `لعمر ${product.ageGroup} سنوات` : `Ages ${product.ageGroup}`}
                  </span>
                )}
              </div>

              {/* Product Image Album Trigger Button */}
              <button
                type="button"
                onClick={() => setIsAlbumModalOpen(true)}
                className="absolute bottom-3 right-3 rtl:right-auto rtl:left-3 z-10 px-3 py-1.5 bg-black/70 hover:bg-[#340404] text-white text-[11px] font-semibold uppercase tracking-wider rounded-xs backdrop-blur-md border border-[#8E7C49]/40 flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105"
                title="Open Product Image Album"
              >
                <Images className="w-3.5 h-3.5 text-[#8E7C49]" />
                <span>{language === 'ar' ? 'عرض ألبوم الصور' : 'Product Album'}</span>
                <span className="text-[10px] text-[#8E7C49] font-mono">({product.images.length})</span>
              </button>
            </div>

            {/* Thumbnail Navigation */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-24 rounded-xs overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIndex === idx
                        ? 'border-[#340404] ring-1 ring-[#340404]'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              
              {/* Category, SKU, and Dynamic Stock Badge */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#8E7C49] uppercase tracking-wider font-semibold flex-wrap gap-2">
                  <span>{language === 'ar' ? product.categoryNameAr : product.categoryNameEn}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#340404]/60">SKU: {product.sku}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8E7C49]/15 text-[#8E7C49] border border-[#8E7C49]/30">
                      <Package className="w-3 h-3" />
                      {totalProductStock} {language === 'ar' ? 'قطعة في المخزون' : 'Units in Stock'}
                    </span>
                  </div>
                </div>

                <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#340404] leading-tight">
                  {displayName}
                </h1>

                <div className="flex items-center gap-2 pt-1 text-xs">
                  <div className="text-[#8E7C49] font-medium tracking-tighter">★★★★★</div>
                  <span className="font-semibold text-[#340404]">{product.rating}</span>
                  <span className="text-[#340404]/60">({product.reviewCount} {t.product.reviews})</span>
                </div>
              </div>

              {/* Price Block in BHD */}
              <div className="flex items-baseline gap-4 py-2 border-y border-[#E1D1E4]/70">
                {product.salePrice ? (
                  <>
                    <span className="text-3xl font-bold text-[#E22001] tabular-nums">
                      {formatBHD(product.salePrice)}
                    </span>
                    <span className="text-base text-[#340404]/50 line-through tabular-nums">
                      {formatBHD(product.price)}
                    </span>
                    <span className="text-xs text-[#E22001] font-semibold bg-[#E22001]/10 px-2 py-0.5 rounded-xs">
                      {Math.round(((product.price - product.salePrice) / product.price) * 100)}% {language === 'ar' ? 'خصم' : 'OFF'}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-[#340404] tabular-nums">
                    {formatBHD(product.price)}
                  </span>
                )}
              </div>

              {/* Color Variety Selector with live stock counts */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#340404] uppercase tracking-wider flex items-center gap-1.5">
                    <span>{t.product.selectColor}:</span>
                    <span className="text-[#8E7C49] font-bold">
                      {language === 'ar' ? selectedColor.nameAr : selectedColor.nameEn}
                    </span>
                  </span>
                  <span className="text-[11px] text-[#8E7C49] font-medium">
                    {selectedColor.totalStock} {language === 'ar' ? 'قطعة بهذا اللون' : 'units in this color'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uniqueColors.map((color) => {
                    const isSelected = selectedColor.hex.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`p-2 rounded-xs border text-left rtl:text-right flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#340404] bg-[#FBE7E3] ring-1 ring-[#340404] shadow-xs'
                            : 'border-[#E1D1E4] bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-black/20 shrink-0 shadow-xs"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#340404] truncate">
                            {language === 'ar' ? color.nameAr : color.nameEn}
                          </p>
                          <p className="text-[10px] text-[#8E7C49] font-medium">
                            {color.totalStock > 0 ? `${color.totalStock} ${language === 'ar' ? 'متوفر' : 'in stock'}` : (language === 'ar' ? 'نفذت الكمية' : 'Sold out')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Variety Selector with per-variant stock indicators */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#340404] uppercase tracking-wider">{t.product.selectSize}:</span>
                  <button
                    onClick={() => setIsKidsSizeModalOpen(true)}
                    className="text-[#8E7C49] underline cursor-pointer hover:text-[#340404]"
                  >
                    {product.isKids || product.ageGroup ? (language === 'ar' ? 'دليل مقاسات الأطفال' : 'Kids Size Guide') : t.product.sizeGuide}
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(product.variants.length > 0
                    ? Array.from(new Set(product.variants.map((v) => v.size)))
                    : (['XS', 'S', 'M', 'L', 'XL'] as ProductSize[])
                  ).map((size) => {
                    const isSelected = selectedSize === size;
                    const varStock = product.variants.find(
                      (v) =>
                        v.size === size &&
                        (v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase() ||
                          v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase())
                    )?.stock ?? 0;

                    const isVarOut = varStock === 0;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`p-2.5 rounded-xs border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#E1D1E4] text-[#340404] border-[#340404] shadow-xs font-bold ring-1 ring-[#340404]'
                            : isVarOut
                            ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60'
                            : 'bg-white text-[#340404] border-[#E1D1E4] hover:bg-[#FBE7E3]'
                        }`}
                      >
                        <span className="text-xs font-bold">{size}</span>
                        <span className={`text-[10px] mt-0.5 font-medium ${
                          isVarOut ? 'text-red-500 line-through' : varStock <= 3 ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {isVarOut ? (language === 'ar' ? 'نفذ' : 'Out') : `${varStock} ${language === 'ar' ? 'قطعة' : 'left'}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Variety Explorer: Click through Available Varieties & Stock */}
              <div className="bg-white p-4 rounded-sm border border-[#E1D1E4] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#8E7C49]" />
                    <span className="font-semibold text-xs text-[#340404] uppercase tracking-wider">
                      {language === 'ar' ? 'تصفحي جميع الموديلات والمخزون المتاح' : 'Click Through Available Varieties & Stock'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8E7C49]/15 text-[#8E7C49]">
                    {product.variants.length} {language === 'ar' ? 'موديلات متوفرة' : 'Varieties Available'}
                  </span>
                </div>

                <p className="text-[11px] text-[#340404]/70">
                  {language === 'ar'
                    ? 'اضغطي على أي موديل لتحديده وتحديث المقاس واللون والكمية المتوفرة تلقائياً:'
                    : 'Click any variety tile below to switch color & size and see real-time warehouse stock:'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {product.variants.map((v, idx) => {
                    const isSelected =
                      (v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase() ||
                        v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase()) &&
                      v.size === selectedSize;

                    const vStock = Number(v.stock) || 0;
                    const isVOut = vStock === 0;
                    const isVLow = vStock > 0 && vStock <= 3;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const matchedColor = uniqueColors.find(
                            (c) =>
                              c.hex.toLowerCase() === v.colorHex.toLowerCase() ||
                              c.nameEn.toLowerCase() === v.colorNameEn.toLowerCase()
                          );
                          if (matchedColor) {
                            setSelectedColor(matchedColor);
                          }
                          setSelectedSize(v.size as ProductSize);
                        }}
                        className={`p-2 rounded-xs border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#340404] bg-[#FBE7E3] ring-1 ring-[#340404] shadow-xs'
                            : isVOut
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : 'border-[#E1D1E4] bg-white hover:border-[#8E7C49]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: v.colorHex }}
                          />
                          <span className="text-[11px] font-semibold text-[#340404] truncate">
                            {language === 'ar' ? v.colorNameAr : v.colorNameEn}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/5">
                          <span className="font-mono font-bold text-[#340404] bg-white px-1.5 py-0.2 rounded-xs border border-[#E1D1E4]">
                            {v.size}
                          </span>
                          <span
                            className={`font-bold tabular-nums text-[10px] ${
                              isVOut
                                ? 'text-red-600 line-through'
                                : isVLow
                                ? 'text-amber-800'
                                : 'text-emerald-700'
                            }`}
                          >
                            {isVOut
                              ? (language === 'ar' ? 'نفذت' : 'Out')
                              : `${vStock} ${language === 'ar' ? 'قطع' : 'left'}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Variety Stock & Availability Status Callout */}
              <div className={`p-3 rounded-xs border flex items-center justify-between text-xs ${
                isOutOfStock
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : isLowStock
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  {isOutOfStock ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {isOutOfStock
                        ? (language === 'ar' ? 'نفذت الكمية لهذا المقاس واللون' : 'Selected Variety Out of Stock')
                        : isLowStock
                        ? (language === 'ar' ? `كمية محدودة جداً: باقي ${availableStock} قطع فقط!` : `Low Stock Alert: Only ${availableStock} units remaining!`)
                        : (language === 'ar' ? `متوفر في المخزون: ${availableStock} قطع جاهزة للتوصيل السريع` : `In Stock: ${availableStock} units ready for immediate Bahrain dispatch`)}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {selectedColor.nameEn} · {selectedSize} · SKU: {currentVariant?.sku || product.sku}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity & CTAs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-[#E1D1E4] rounded-xs bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-3 text-[#340404] hover:bg-[#FBE7E3]"
                    >
                      -
                    </button>
                    <span className="px-4 text-xs font-semibold tabular-nums text-[#340404]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                      className="px-3 py-3 text-[#340404] hover:bg-[#FBE7E3]"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart CTA (Scarlet) */}
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 py-3.5 px-6 font-semibold text-xs uppercase tracking-wider rounded-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                      isOutOfStock
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isAddedFeedback
                        ? 'bg-[#8E7C49] text-white'
                        : 'bg-[#E22001] hover:bg-[#c01b01] text-white'
                    }`}
                  >
                    {isAddedFeedback ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{t.product.addedToCart}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>{t.product.addToCart}</span>
                      </>
                    )}
                  </button>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`p-3.5 rounded-xs border transition-colors ${
                      isWishlisted
                        ? 'bg-[#E22001] text-white border-[#E22001]'
                        : 'border-[#E1D1E4] text-[#340404] hover:bg-[#FBE7E3]'
                    }`}
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Instant Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="w-full py-3 px-6 bg-[#340404] hover:bg-black text-[#FBE7E3] font-semibold text-xs uppercase tracking-wider rounded-xs transition-colors disabled:opacity-50"
                >
                  {t.product.buyNow}
                </button>
              </div>

              {/* Bahrain Delivery Guarantee Strip */}
              <div className="bg-[#FBE7E3]/60 p-3.5 rounded-xs border border-[#E1D1E4] space-y-2 text-xs text-[#340404]">
                <div className="flex items-center gap-2 text-[#8E7C49] font-semibold">
                  <Truck className="w-4 h-4" />
                  <span>{language === 'ar' ? 'توصيل سريع داخل مملكة البحرين' : 'Bahrain Delivery & Courier'}</span>
                </div>
                <p className="text-[11px] text-[#340404]/80 leading-relaxed">
                  {t.product.deliveryInfo}
                </p>
              </div>

            </div>

            {/* Product Specifications & Care Tabs */}
            <div className="pt-6 border-t border-[#E1D1E4]">
              <div className="flex gap-4 border-b border-[#E1D1E4] pb-2 text-xs font-semibold uppercase tracking-wider">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-1 transition-colors ${
                    activeTab === 'details' ? 'text-[#E22001] border-b-2 border-[#E22001]' : 'text-[#340404]/60'
                  }`}
                >
                  {language === 'ar' ? 'الوصف والخامة' : 'Fabric & Details'}
                </button>
                <button
                  onClick={() => setActiveTab('care')}
                  className={`pb-1 transition-colors ${
                    activeTab === 'care' ? 'text-[#E22001] border-b-2 border-[#E22001]' : 'text-[#340404]/60'
                  }`}
                >
                  {language === 'ar' ? 'إرشادات العناية' : 'Care Guide'}
                </button>
                <button
                  onClick={() => setActiveTab('shipping')}
                  className={`pb-1 transition-colors ${
                    activeTab === 'shipping' ? 'text-[#E22001] border-b-2 border-[#E22001]' : 'text-[#340404]/60'
                  }`}
                >
                  {language === 'ar' ? 'الشحن والاسترجاع' : 'Shipping & Returns'}
                </button>
                <button
                  onClick={() => setActiveTab('varieties')}
                  className={`pb-1 transition-colors ${
                    activeTab === 'varieties' ? 'text-[#E22001] border-b-2 border-[#E22001]' : 'text-[#340404]/60'
                  }`}
                >
                  {language === 'ar' ? 'الموديلات والمخزون' : 'Stock & Varieties'}
                </button>
              </div>

              <div className="pt-3 text-xs text-[#340404]/80 leading-relaxed font-light">
                {activeTab === 'details' && (
                  <div className="space-y-2">
                    <p>{displayDesc}</p>
                    <p><strong>{language === 'ar' ? 'الخامة:' : 'Material:'}</strong> {displayMaterial}</p>
                  </div>
                )}
                {activeTab === 'care' && (
                  <p>{displayCare}</p>
                )}
                {activeTab === 'shipping' && (
                  <p>{t.product.deliveryInfo}</p>
                )}
                {activeTab === 'varieties' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-[#340404]/80">
                      {language === 'ar'
                        ? 'جدول المخزون المتاح لحظياً من مستودع البحرين لكافة الألوان والمقاسات:'
                        : 'Warehouse stock balance for all active sizes & color shades:'}
                    </p>
                    <div className="border border-[#E1D1E4] rounded-xs overflow-hidden">
                      <table className="w-full text-left rtl:text-right text-[11px]">
                        <thead className="bg-[#FBE7E3]/60 text-[#340404] font-semibold uppercase">
                          <tr>
                            <th className="p-2.5">{language === 'ar' ? 'اللون' : 'Color'}</th>
                            <th className="p-2.5">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                            <th className="p-2.5">{language === 'ar' ? 'المخزون' : 'In Stock'}</th>
                            <th className="p-2.5 text-right rtl:text-left">{language === 'ar' ? 'اختيار' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E1D1E4]/60 bg-white">
                          {product.variants.map((v, i) => {
                            const vStock = Number(v.stock) || 0;
                            const isVSelected =
                              (v.colorHex.toLowerCase() === selectedColor.hex.toLowerCase() ||
                                v.colorNameEn.toLowerCase() === selectedColor.nameEn.toLowerCase()) &&
                              v.size === selectedSize;

                            return (
                              <tr key={i} className={isVSelected ? 'bg-[#FBE7E3]/30 font-semibold' : ''}>
                                <td className="p-2.5 flex items-center gap-1.5">
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/20"
                                    style={{ backgroundColor: v.colorHex }}
                                  />
                                  <span>{language === 'ar' ? v.colorNameAr : v.colorNameEn}</span>
                                </td>
                                <td className="p-2.5 font-mono">{v.size}</td>
                                <td className="p-2.5">
                                  <span className={vStock === 0 ? 'text-red-600' : vStock <= 3 ? 'text-amber-800' : 'text-emerald-700'}>
                                    {vStock === 0 ? (language === 'ar' ? 'نفذت الكمية' : 'Out of stock') : `${vStock} ${language === 'ar' ? 'قطعة' : 'units'}`}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right rtl:text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matchedColor = uniqueColors.find(
                                        (c) =>
                                          c.hex.toLowerCase() === v.colorHex.toLowerCase() ||
                                          c.nameEn.toLowerCase() === v.colorNameEn.toLowerCase()
                                      );
                                      if (matchedColor) setSelectedColor(matchedColor);
                                      setSelectedSize(v.size as ProductSize);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-xs bg-[#FBE7E3] hover:bg-[#340404] hover:text-white transition-colors cursor-pointer"
                                  >
                                    {isVSelected ? (language === 'ar' ? 'محدد حالياً' : 'Selected') : (language === 'ar' ? 'اختيار' : 'Select')}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Dedicated Product Image Album Showcase for Available Product */}
        {product.images && product.images.length > 0 && (
          <div className="mt-16 bg-white p-6 sm:p-10 rounded-sm border border-[#E1D1E4] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E1D1E4] pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8E7C49] uppercase tracking-wider">
                  <Images className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'ألبوم صور القطعة المتوفرة' : 'Product Photo Album'}</span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#340404] mt-1">
                  {language === 'ar' ? `ألبوم صور: ${displayName}` : `Image Album: ${displayName}`}
                </h3>
                <p className="text-xs text-[#340404]/70 mt-1">
                  {language === 'ar' 
                    ? `استعرضي جميع الصور والزوايا المتاحة لهذه القطعة (${product.images.length} صور عالية الدقة). انقري على أي صورة للتكبير الكامل.`
                    : `High-resolution studio photography capturing every angle and detail (${product.images.length} available photos). Click any image to view in full resolution.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAlbumModalOpen(true)}
                className="px-4 py-2 bg-[#340404] hover:bg-[#E22001] text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#8E7C49]" />
                <span>{language === 'ar' ? 'فتح الألبوم كامل الشاشة' : 'Open Fullscreen Album'}</span>
              </button>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {product.images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setIsAlbumModalOpen(true);
                  }}
                  className="group relative aspect-[3/4] rounded-xs overflow-hidden border border-[#E1D1E4] hover:border-[#8E7C49] bg-neutral-50 cursor-pointer shadow-xs transition-all duration-300 hover:shadow-lg"
                >
                  <img
                    src={img}
                    alt={`${displayName} - Photo ${idx + 1}`}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                    <span className="p-2 rounded-full bg-white/90 text-[#340404] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-200 shadow-md">
                      <Maximize2 className="w-4 h-4 text-[#8E7C49]" />
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-1.5 py-0.5 rounded-xs">
                    {idx + 1} / {product.images.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Products Carousel */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="font-heading text-2xl font-semibold text-[#340404] mb-6">
              {t.carousels.youMayAlsoLike}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={onQuickView}
                  onSelectProduct={onSelectProduct}
                  onOpenAlbumModal={() => {
                    onSelectProduct(p);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Children Size Guide Modal */}
        {isKidsSizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-sm border border-[#E1D1E4] max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E1D1E4] pb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-[#8E7C49]" />
                  <h3 className="font-heading text-lg font-semibold text-[#340404]">
                    {t.kidsCollection.sizeGuideTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setIsKidsSizeModalOpen(false)}
                  className="text-[#340404]/60 hover:text-[#340404] text-sm p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#340404]/80">
                {t.kidsCollection.sizeGuideDesc}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right border border-[#E1D1E4]">
                  <thead className="bg-[#FAF5F2] text-[#340404] font-semibold">
                    <tr>
                      <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'الفئة العمرية' : 'Age Bracket'}</th>
                      <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                      <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'طول الطفل' : 'Height'}</th>
                      <th className="p-2.5 border-b border-[#E1D1E4]">{language === 'ar' ? 'الوزن التقريبي' : 'Weight'}</th>
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

              <div className="text-right rtl:text-left pt-2">
                <button
                  onClick={() => setIsKidsSizeModalOpen(false)}
                  className="px-5 py-2 bg-[#340404] text-white text-xs font-semibold rounded-xs hover:bg-[#E22001] transition-colors"
                >
                  {language === 'ar' ? 'إغلاق الدليل' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Product Image Album Modal */}
        <ProductAlbumModal
          isOpen={isAlbumModalOpen}
          onClose={() => setIsAlbumModalOpen(false)}
          product={product}
          allProducts={products}
          onSelectProduct={onSelectProduct}
          initialImageIndex={activeImageIndex}
        />

      </div>
    </div>
  );
};
