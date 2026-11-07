import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import { myfatoorahService, MYFATOORAH_PAYMENT_METHODS } from '../services/myfatoorahService';
import { BahrainAddress, PaymentMethodType, Order } from '../types';
import { 
  Check, 
  Lock, 
  Smartphone, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  QrCode,
  Truck,
  Mail,
  FileText,
  Sparkles
} from 'lucide-react';

interface CheckoutPageProps {
  onOrderSuccess: (order: Order) => void;
  onBackToCart: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onOrderSuccess,
  onBackToCart,
}) => {
  const { cart, subtotal, discount, shippingFee, total, shippingOption, setShippingOption, clearCart, appliedCoupon } = useCart();
  const { language, formatBHD, t, isRtl } = useLanguage();
  const { addOrder, deductInventory } = useStore();
  const { currentUser, openAuthModal } = useAuth();

  // Form State - Customer Information
  const [customerName, setCustomerName] = useState(
    currentUser && !currentUser.isGuest ? `${currentUser.firstName} ${currentUser.lastName}` : ''
  );
  const [customerEmail, setCustomerEmail] = useState(
    currentUser && !currentUser.isGuest ? currentUser.email : ''
  );
  const [customerPhone, setCustomerPhone] = useState(
    currentUser && !currentUser.isGuest && currentUser?.phone
      ? currentUser.phone.replace('+973', '').trim()
      : '3922 1144'
  );

  // Delivery Address (Bahrain structure)
  const defaultAddress = !currentUser?.isGuest ? currentUser?.savedAddresses[0] : undefined;
  const [buildingNumber, setBuildingNumber] = useState(defaultAddress?.buildingNumber || 'Villa 24');
  const [roadNumber, setRoadNumber] = useState(defaultAddress?.roadNumber || 'Road 3812');
  const [blockNumber, setBlockNumber] = useState(defaultAddress?.blockNumber || 'Block 338');
  const [area, setArea] = useState(defaultAddress?.area || 'Adliya');
  const [city, setCity] = useState(defaultAddress?.city || 'Manama');
  const [additionalInstructions, setAdditionalInstructions] = useState(defaultAddress?.additionalInstructions || '');

  // Sync with currentUser when user logs in via OAuth/Email modal
  React.useEffect(() => {
    if (currentUser && !currentUser.isGuest) {
      setCustomerName(`${currentUser.firstName} ${currentUser.lastName}`);
      setCustomerEmail(currentUser.email);
      if (currentUser.phone) {
        setCustomerPhone(currentUser.phone.replace('+973', '').trim());
      }
      if (currentUser.savedAddresses && currentUser.savedAddresses.length > 0) {
        const addr = currentUser.savedAddresses[0];
        setBuildingNumber(addr.buildingNumber);
        setRoadNumber(addr.roadNumber);
        setBlockNumber(addr.blockNumber);
        setArea(addr.area);
        setCity(addr.city);
        if (addr.additionalInstructions) {
          setAdditionalInstructions(addr.additionalInstructions);
        }
      }
    }
  }, [currentUser]);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('myfatoorah');
  const [myfatoorahSubMethod, setMyfatoorahSubMethod] = useState<number>(6); // Default BenefitPay (6)
  const [sendReceiptViaEmail, setSendReceiptViaEmail] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Card details
  const [cardHolder, setCardHolder] = useState('FATIMA AL KHALIFA');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('884');

  // BenefitPay simulated interactive flow
  const [benefitStep, setBenefitStep] = useState<'scan' | 'approved'>('scan');

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    // Mandatory Account Creation Check for Guests
    if (!currentUser || currentUser.isGuest) {
      setPaymentError(
        language === 'ar'
          ? 'يرجى إنشاء حساب جديد أو تسجيل الدخول أولاً لإتمام عملية الشراء والدفع.'
          : 'Please create an account or sign in before checking out.'
      );
      openAuthModal('signup');
      return;
    }

    // Validation
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setPaymentError(language === 'ar' ? 'يرجى إكمال بيانات العميل المطلوبة' : 'Please complete all customer details.');
      return;
    }
    if (!buildingNumber.trim() || !roadNumber.trim() || !blockNumber.trim() || !area.trim()) {
      setPaymentError(language === 'ar' ? 'يرجى إدخال تفاصيل العنوان في البحرين' : 'Please complete all address fields.');
      return;
    }

    setIsProcessing(true);

    try {
      const orderNumber = `BDS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // Execute payment through abstraction service
      const paymentResult = await paymentService.executePayment(paymentMethod, {
        orderId: `ord-${Date.now()}`,
        orderNumber,
        amount: total,
        currency: 'BHD',
        customerName,
        customerEmail,
        customerPhone: `+973 ${customerPhone}`,
        myfatoorahMethodId: paymentMethod === 'myfatoorah' ? myfatoorahSubMethod : undefined,
        cardDetails: paymentMethod === 'visa_mastercard' ? {
          cardHolder,
          cardNumber,
          expiry: cardExpiry,
          cvv: cardCvv,
        } : undefined,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment authorization failed');
      }

      // Map cart items with high fidelity metadata for itemized customer receipt
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        nameEn: item.product.nameEn,
        nameAr: item.product.nameAr,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        image: item.product.images[0] || '',
      }));

      // Deduct inventory
      const itemsToDeduct = cart.map((item) => ({
        productId: item.productId,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      }));
      deductInventory(itemsToDeduct);

      const isPod = paymentMethod === 'pay_on_delivery';
      const sixDigitCode = paymentResult.authorizationCode || Math.floor(100000 + Math.random() * 900000).toString();
      const qrData = `BDS-VERIFY:${orderNumber}:${sixDigitCode}:${total.toFixed(3)}:BHD`;

      // Dispatch Customer Receipt if option selected
      if (sendReceiptViaEmail) {
        myfatoorahService.sendPaymentReceipt({
          orderNumber,
          customerName,
          customerEmail,
          customerPhone: `+973 ${customerPhone}`,
          invoiceId: paymentResult.invoiceId,
          transactionId: paymentResult.transactionId,
          paymentMethod,
          channel: 'ALL',
          subtotal,
          shippingFee,
          discount,
          total,
          currency: 'BHD',
          items: orderItems,
          shippingAddress: {
            buildingNumber,
            roadNumber,
            blockNumber,
            area,
            city,
            country: 'Bahrain',
          },
        }).catch((err) => {
          console.warn('Background receipt dispatch notice:', err);
        });
      }

      // Create confirmed order
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber,
        userId: currentUser?.id,
        customerName,
        customerEmail,
        customerPhone: `+973 ${customerPhone}`,
        shippingAddress: {
          buildingNumber,
          roadNumber,
          blockNumber,
          area,
          city,
          country: 'Bahrain',
          additionalInstructions,
        },
        deliveryOption: shippingOption,
        shippingFee,
        subtotal,
        discount,
        total,
        currency: 'BHD',
        couponCode: appliedCoupon?.code,
        paymentMethod,
        paymentTransactionId: paymentResult.transactionId,
        paymentStatus: isPod ? 'Pending' : 'Paid',
        items: orderItems,
        myfatoorahInvoiceId: paymentResult.invoiceId ? String(paymentResult.invoiceId) : undefined,
        myfatoorahPaymentUrl: paymentResult.paymentUrl,
        myfatoorahPaymentMethod: paymentMethod === 'myfatoorah'
          ? (MYFATOORAH_PAYMENT_METHODS.find((m) => m.PaymentMethodId === myfatoorahSubMethod)?.PaymentMethodEn || 'BenefitPay')
          : undefined,
        receiptSentToEmail: sendReceiptViaEmail,
        receiptSentToPhone: sendReceiptViaEmail,
        receiptSentAt: sendReceiptViaEmail ? new Date().toISOString() : undefined,
        receiptSentEmailAddress: customerEmail,
        deliveryVerificationCode: isPod ? sixDigitCode : undefined,
        deliveryVerificationQrData: isPod ? qrData : undefined,
        isDeliveryPaidConfirmed: false,
        orderStatus: 'Confirmed',
        statusHistory: [
          { status: 'Pending', timestamp: new Date().toISOString() },
          { 
            status: 'Confirmed', 
            timestamp: new Date().toISOString(), 
            note: isPod 
              ? `Order confirmed. 6-digit delivery verification PIN (${sixDigitCode}) generated for payment on arrival.` 
              : paymentMethod === 'myfatoorah'
              ? `Paid & Settled via MyFatoorah Gateway (Invoice #${paymentResult.invoiceId || 'MF'}). Purchase receipt dispatched.`
              : 'Payment verified successfully via gateway' 
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addOrder(newOrder);
      clearCart();
      setIsProcessing(false);
      onOrderSuccess(newOrder);

    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError(err?.message || 'Payment processing error. Please try again.');
    }
  };

  return (
    <div className="bg-[var(--color-bg)] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
            {language === 'ar' ? 'البحرين · الدفع الآمن والمشفر' : 'The Deluxe Bedtime Store · Secure Checkout'}
          </span>
          <h1 className="font-heading text-3xl font-semibold text-[var(--color-text)]">
            {t.checkout.title}
          </h1>
        </div>

        <form onSubmit={handleSubmitPayment}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 2 Steps: Info & Address & Payment */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Step 1: Customer Information */}
              <div className="bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h2 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                    {t.checkout.step1Title}
                  </h2>
                </div>

                {(!currentUser || currentUser.isGuest) && (
                  <div className="bg-[var(--color-text)] text-[var(--color-bg)] p-5 rounded-sm border border-[var(--color-accent)] shadow-md space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-xs shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[var(--color-accent)] text-white rounded-xs">
                            {language === 'ar' ? 'مطلوب إنشاء حساب' : 'Account Required'}
                          </span>
                        </div>
                        <h3 className="font-heading text-base font-bold text-white">
                          {language === 'ar' ? 'إنشاء حساب قبل إتمام الطلب' : 'Create an Account to Complete Checkout'}
                        </h3>
                        <p className="text-xs text-[var(--color-bg)]/80 leading-relaxed">
                          {language === 'ar'
                            ? 'يسعدنا تسوقكِ معنا! كعميلة زائرة تم حفظ جميع منتجاتكِ في السلة بأمان. يرجى إنشاء حساب لتسجيل العنوان، ومتابعة شحنتكِ في البحرين، وتأكيد الدفع.'
                            : 'All items in your cart are safely saved. Guests must create an account to record your Bahrain delivery address, track orders, and complete checkout.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => openAuthModal('signup')}
                        className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider rounded-xs shadow-xs transition-colors cursor-pointer"
                      >
                        {language === 'ar' ? 'إنشاء حساب جديد الآن' : 'Create New Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAuthModal('signin')}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white text-white hover:text-[var(--color-text)] text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                      >
                        {language === 'ar' ? 'لديكِ حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign In'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.fullName} *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Fatima Al Khalifa"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.email} *</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. fatima@example.bh"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.phone} *</label>
                    <div className="flex items-center">
                      <span className="bg-[var(--color-border)] border border-[var(--color-border)] px-2.5 py-2 text-xs font-semibold text-[var(--color-text)] rounded-l-xs rtl:rounded-l-none rtl:rounded-r-xs">
                        +973
                      </span>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="3900 1234"
                        className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-r-xs rtl:rounded-r-none rtl:rounded-l-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Bahrain Delivery Address */}
              <div className="bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h2 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                    {t.checkout.step2Title}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.building} *</label>
                    <input
                      type="text"
                      required
                      value={buildingNumber}
                      onChange={(e) => setBuildingNumber(e.target.value)}
                      placeholder="Villa 24 / Apt 4B"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.road} *</label>
                    <input
                      type="text"
                      required
                      value={roadNumber}
                      onChange={(e) => setRoadNumber(e.target.value)}
                      placeholder="Road 3812"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.block} *</label>
                    <input
                      type="text"
                      required
                      value={blockNumber}
                      onChange={(e) => setBlockNumber(e.target.value)}
                      placeholder="Block 338"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.area} *</label>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Adliya, Seef, Saar, Amwaj, Riffa"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.city} *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Manama"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="font-semibold text-[var(--color-text)]">{t.checkout.additionalNotes}</label>
                    <input
                      type="text"
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="Special gate instructions, doorbell..."
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Delivery Option Selector */}
                <div className="pt-3 border-t border-[var(--color-border)]/70 space-y-2">
                  <label className="text-xs font-semibold text-[var(--color-text)] block uppercase tracking-wider">
                    {t.checkout.deliveryMethod}
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className={`p-3 rounded-xs border cursor-pointer flex items-center justify-between transition-colors ${
                      shippingOption === 'standard' ? 'bg-[var(--color-border)]/60 border-[var(--color-text)] font-semibold' : 'bg-white border-[var(--color-border)]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shippingOption"
                          checked={shippingOption === 'standard'}
                          onChange={() => setShippingOption('standard')}
                          className="accent-[var(--color-primary)]"
                        />
                        <span>{language === 'ar' ? 'توصيل عادي (١-٢ يوم)' : 'Standard (1-2 Days)'}</span>
                      </div>
                      <span className="font-bold tabular-nums">
                        {subtotal >= 25 ? (language === 'ar' ? 'مجاني' : 'FREE') : '1.500 BHD'}
                      </span>
                    </label>

                    <label className={`p-3 rounded-xs border cursor-pointer flex items-center justify-between transition-colors ${
                      shippingOption === 'express' ? 'bg-[var(--color-border)]/60 border-[var(--color-text)] font-semibold' : 'bg-white border-[var(--color-border)]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shippingOption"
                          checked={shippingOption === 'express'}
                          onChange={() => setShippingOption('express')}
                          className="accent-[var(--color-primary)]"
                        />
                        <span>{language === 'ar' ? 'توصيل فوري نفس اليوم' : 'Same-Day Express'}</span>
                      </div>
                      <span className="font-bold tabular-nums">2.500 BHD</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 3: Bahrain Payment Gateway */}
              <div className="bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h2 className="font-heading text-lg font-semibold text-[var(--color-text)]">
                    {t.checkout.step3Title}
                  </h2>
                </div>

                {/* Method Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  
              

                  {/* 4. Visa / Mastercard */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('visa_mastercard')}
                    className={`p-2.5 rounded-xs border text-center transition-all cursor-pointer ${
                      paymentMethod === 'visa_mastercard'
                        ? 'border-[#1434CB] bg-[var(--color-bg)] ring-1 ring-[#1434CB]'
                        : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]/40'
                    }`}
                  >
                    <div className="font-black italic text-xs text-[#1434CB]">VISA / MC</div>
                    <span className="text-[10px] text-[var(--color-text)]/70 mt-1 block">
                      {language === 'ar' ? 'بطاقة الائتمان' : 'Card'}
                    </span>
                  </button>

                  {/* 5. Pay on Delivery */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_delivery')}
                    className={`p-2.5 rounded-xs border text-center transition-all cursor-pointer ${
                      paymentMethod === 'pay_on_delivery'
                        ? 'border-[var(--color-accent)] bg-[var(--color-bg)] ring-1 ring-[var(--color-accent)]'
                        : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg)]/40'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--color-accent)] flex items-center justify-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>POD</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text)]/70 mt-1 block">
                      {language === 'ar' ? 'عند الاستلام' : 'On Delivery'}
                    </span>
                  </button>
                </div>

                {/* Payment Provider Details Box */}
                <div className="p-4 bg-[var(--color-bg)]/30 rounded-xs border border-[var(--color-border)]">
                  
                  

                    
                  {/* Pay on Delivery Interface */}
                  {paymentMethod === 'pay_on_delivery' && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-[var(--color-card)] rounded-xs border border-[var(--color-border)] shadow-xs text-[var(--color-accent)]">
                          <Truck className="w-8 h-8 text-[var(--color-accent)]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-[var(--color-text)]">
                            {t.checkout.payOnDelivery}
                          </p>
                          <p className="text-[11px] text-[var(--color-text)]/70 leading-relaxed">
                            {t.checkout.payOnDeliveryDesc}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-xs border border-[var(--color-accent)]/40 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-[var(--color-accent)] font-semibold">
                          <ShieldCheck className="w-4 h-4" />
                          <span>{language === 'ar' ? 'آلية التحقق برمز السداد ورمز QR:' : '6-Digit Code & QR Verification Protocol:'}</span>
                        </div>
                        <ul className="list-disc pl-4 rtl:pl-0 rtl:pr-4 text-[11px] text-[var(--color-text)]/80 space-y-1">
                          <li>{language === 'ar' ? 'سيتم إصدار كود تحقق تلقائي مكون من ٦ أرقام مع تأكيد الطلب.' : 'An autogenerated 6-digit confirmation PIN will be created upon ordering.'}</li>
                          <li>{language === 'ar' ? 'سيتوفر رمز QR مخصص يمكن للمندوب أو الإدارة مسحه فور وصول الطلب لتأكيد الدفع.' : 'A live QR code is provided for courier/admin instant scan verification.'}</li>
                          <li>{language === 'ar' ? 'يمكنكِ الدفع نقدًا بالدينار البحريني أو عبر جهاز بنفت بي المتنقل عند الباب.' : 'Pay by cash in BHD or with portable BenefitPay / card terminal at your doorstep.'}</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  
                  {/* Card Payment Interface */}
                  {paymentMethod === 'visa_mastercard' && (
                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-[var(--color-text)]">{t.checkout.cardHolder}</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs font-mono uppercase"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-[var(--color-text)]">{t.checkout.cardNumber}</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-[var(--color-text)]">{t.checkout.expiry}</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-[var(--color-text)]">{t.checkout.cvv}</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Error Alert */}
                {paymentError && (
                  <div className="p-3 bg-red-50 border border-[var(--color-primary)]/30 rounded-xs flex items-center gap-2 text-xs text-[var(--color-primary)]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

              </div>

            </div>

            {/* Right Column: Order Summary & Pay CTA */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[var(--color-card)] p-6 sm:p-8 rounded-sm border border-[var(--color-border)] shadow-xs space-y-6 sticky top-28">
                
                <h2 className="font-heading text-xl font-semibold text-[var(--color-text)] border-b border-[var(--color-border)] pb-3">
                  {t.orderConfirmation.orderSummary} ({cart.length})
                </h2>

                {/* Items Preview */}
                <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-[var(--color-border)]/50 pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.product.images[0]}
                          alt=""
                          className="w-12 h-14 object-cover rounded-xs border border-[var(--color-border)]"
                        />
                        <div>
                          <p className="font-semibold text-[var(--color-text)] line-clamp-1">
                            {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                          </p>
                          <p className="text-[11px] text-[var(--color-text)]/60">
                            {item.size} · {item.color} · Qty {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-[var(--color-text)] tabular-nums shrink-0">
                        {formatBHD(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="space-y-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text)]/80">
                  <div className="flex justify-between">
                    <span>{t.cart.subtotal}</span>
                    <span className="font-semibold text-[var(--color-text)] tabular-nums">{formatBHD(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--color-primary)]">
                      <span>{t.cart.discount} ({appliedCoupon?.code})</span>
                      <span className="font-bold tabular-nums">-{formatBHD(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>{t.cart.shipping}</span>
                    <span className="font-semibold text-[var(--color-text)] tabular-nums">
                      {shippingFee === 0 ? (
                        <span className="text-[var(--color-accent)] font-bold">
                          {language === 'ar' ? 'مجاني' : 'FREE'}
                        </span>
                      ) : (
                        formatBHD(shippingFee)
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-border)] flex justify-between text-base font-bold text-[var(--color-text)]">
                    <span>{t.cart.total}</span>
                    <span className="text-xl text-[var(--color-text)] tabular-nums">{formatBHD(total)}</span>
                  </div>
                </div>

                {/* Option to send customer receipt */}
                <div className="p-3 bg-[var(--color-bg)]/40 border border-[var(--color-accent)]/30 rounded-xs space-y-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={sendReceiptViaEmail}
                      onChange={(e) => setSendReceiptViaEmail(e.target.checked)}
                      className="mt-0.5 rounded-xs text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <div>
                      <span className="font-semibold text-[var(--color-text)] block">
                        {t.checkout.sendReceiptOption}
                      </span>
                      <span className="text-[10px] text-[var(--color-text)]/70 block leading-tight mt-0.5">
                        {language === 'ar'
                          ? `سيتم إرسال إيصال الشراء المعتمد والفاتورة التفصيلية إلى ${customerEmail || 'بريدكِ الإلكتروني'} فور اكتمال الدفع.`
                          : `An official itemized purchase receipt will be automatically dispatched to ${customerEmail || 'your email'} upon purchase.`}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Primary Burgundy Pay CTA or Guest Account Requirement */}
                {!currentUser || currentUser.isGuest ? (
                  <button
                    type="button"
                    onClick={() => openAuthModal('signup')}
                    className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs uppercase tracking-wider rounded-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-[var(--color-gold)]/40 group"
                  >
                    <Lock className="w-4 h-4 text-[var(--color-gold-light)] group-hover:scale-110 transition-transform" />
                    <span>
                      {language === 'ar'
                        ? `إنشاء حساب لإتمام الدفع (${formatBHD(total)})`
                        : `Create Account to Complete Checkout (${formatBHD(total)})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isProcessing || cart.length === 0}
                    className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs uppercase tracking-wider rounded-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <span>{t.checkout.processingPayment}</span>
                    ) : paymentMethod === 'pay_on_delivery' ? (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>{t.checkout.placeOrderPayOnDelivery} ({formatBHD(total)})</span>
                      </>
                    ) : paymentMethod === 'myfatoorah' ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[var(--color-bg)]" />
                        <span>{t.checkout.payWithMyFatoorah.replace('{amount}', formatBHD(total))}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>{t.checkout.payNow.replace('{amount}', formatBHD(total))}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Back to Cart link */}
                <button
                  type="button"
                  onClick={onBackToCart}
                  className="w-full text-center text-xs text-[var(--color-text)]/70 hover:text-[var(--color-text)] underline"
                >
                  {t.cart.continueShopping}
                </button>

                {/* Trust Seal */}
                <div className="pt-3 border-t border-[var(--color-border)]/50 text-[11px] text-[var(--color-text)]/60 text-center leading-relaxed">
                  <ShieldCheck className="w-4 h-4 mx-auto text-[var(--color-accent)] mb-1" />
                  <p>{t.checkout.termsNotice}</p>
                </div>

              </div>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
};
