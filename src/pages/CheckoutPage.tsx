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
  const {
    cart,
    subtotal,
    discount,
    shippingFee,
    freeDeliveryThreshold,
    total,
    shippingOption,
    setShippingOption,
    clearCart,
    appliedCoupon,
  } = useCart();
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Card details
  const [cardHolder, setCardHolder] = useState('FATIMA AL KHALIFA');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('884');

  // BenefitPay simulated interactive flow
  const [benefitStep, setBenefitStep] = useState<'scan' | 'approved'>('scan');

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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

    // Inline Field Validation
    const errors: Record<string, string> = {};
    const requiredMsg =
      language === 'ar'
        ? 'هذا الحقل مطلوب'
        : language === 'ru'
          ? 'Обязательное поле'
          : language === 'fr'
            ? 'Ce champ est requis'
            : 'This field is required';

    if (!customerName.trim()) errors.customerName = requiredMsg;
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      errors.customerEmail =
        language === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح'
          : language === 'ru'
            ? 'Введите корректный email'
            : language === 'fr'
              ? 'Veuillez saisir un e-mail valide'
              : 'Please enter a valid email address';
    }
    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      errors.customerPhone =
        language === 'ar'
          ? 'يرجى إدخال رقم هاتف مكون من 8 أرقام'
          : language === 'ru'
            ? 'Введите 8-значный номер телефона'
            : language === 'fr'
              ? 'Veuillez saisir un numéro à 8 chiffres'
              : 'Please enter an 8-digit mobile number';
    }
    if (!buildingNumber.trim()) errors.buildingNumber = requiredMsg;
    if (!roadNumber.trim()) errors.roadNumber = requiredMsg;
    if (!blockNumber.trim()) errors.blockNumber = requiredMsg;
    if (!area.trim()) errors.area = requiredMsg;
    if (!city.trim()) errors.city = requiredMsg;

    if (paymentMethod === 'visa_mastercard') {
      if (!cardHolder.trim()) errors.cardHolder = requiredMsg;
      if (!cardNumber.trim()) errors.cardNumber = requiredMsg;
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {
        errors.cardExpiry = language === 'ar' ? 'الصيغة MM/YY' : 'Use MM/YY';
      }
      if (cardCvv.replace(/\D/g, '').length < 3) {
        errors.cardCvv = language === 'ar' ? 'أدخلي 3-4 أرقام' : 'Enter 3-4 digits';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setPaymentError(
        language === 'ar'
          ? 'يرجى مراجعة الحقول المحددة باللون الأحمر.'
          : language === 'ru'
            ? 'Пожалуйста, проверьте выделенные поля.'
            : language === 'fr'
              ? 'Veuillez vérifier les champs indiqués ci-dessous.'
              : 'Please check the highlighted fields below.'
      );
      return;
    }

    setFieldErrors({});

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
    <div className="bg-[var(--surface-page)] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--gold-text)] gold-text-rtl-weight">
            {language === 'ar' ? 'البحرين · الدفع الآمن والمشفر' : 'The Deluxe Bedtime Store · Secure Checkout'}
          </span>
          <h1 className="font-heading text-3xl font-semibold text-[var(--maroon-700)]">
            {t.checkout.title}
          </h1>
        </div>

        <form onSubmit={handleSubmitPayment} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 2 Steps: Info & Address & Payment */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Step 1: Customer Information */}
              <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--maroon-700)] text-[var(--text-on-maroon)] text-xs font-bold flex items-center justify-center">1</span>
                  <h2 className="font-heading text-lg font-semibold text-[var(--maroon-700)]">
                    {t.checkout.step1Title}
                  </h2>
                </div>

                {(!currentUser || currentUser.isGuest) && (
                  <div className="bg-[var(--maroon-900)] text-[var(--text-on-maroon)] p-5 rounded-[var(--radius-card)] border border-[var(--gold-decor)] shadow-md space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[var(--gold-decor)]/20 text-[var(--gold-decor)] rounded-xs shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[var(--gold-decor)] text-[var(--maroon-900)] rounded-xs">
                            {language === 'ar' ? 'مطلوب إنشاء حساب' : 'Account Required'}
                          </span>
                        </div>
                        <h3 className="font-heading text-base font-bold text-[var(--text-on-maroon)]">
                          {language === 'ar' ? 'إنشاء حساب قبل إتمام الطلب' : 'Create an Account to Complete Checkout'}
                        </h3>
                        <p className="text-xs text-[var(--surface-champagne)]/90 leading-relaxed">
                          {language === 'ar'
                            ? 'يسعدنا تسوقكِ معنا! كعميلة زائرة تم حفظ جميع منتجاتكِ في السلة بأمان. يرجى إنشاء حساب لتسجيل العنوان، ومتابعة شحنتكِ في البحرين، وتأكيد الدفع.'
                            : 'All items in your cart are safely saved. Guests must create an account to record your Bahrain delivery address, track orders, and complete checkout.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/15">
                      <button
                        type="button"
                        onClick={() => openAuthModal('signup')}
                        className="px-5 py-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] border border-[var(--gold-decor)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] shadow-xs transition-colors cursor-pointer"
                      >
                        {language === 'ar' ? 'إنشاء حساب جديد الآن' : 'Create New Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAuthModal('signin')}
                        className="px-4 py-2.5 bg-white/10 hover:bg-[var(--surface-card)] text-[var(--text-on-maroon)] hover:text-[var(--maroon-700)] text-xs font-semibold rounded-[var(--radius-pill)] transition-colors cursor-pointer"
                      >
                        {language === 'ar' ? 'لديكِ حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign In'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="checkout-name" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.fullName} *
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        clearFieldError('customerName');
                      }}
                      aria-invalid={Boolean(fieldErrors.customerName)}
                      placeholder="e.g. Fatima Al Khalifa"
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                    {fieldErrors.customerName && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.customerName}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="checkout-email" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.email} *
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        clearFieldError('customerEmail');
                      }}
                      aria-invalid={Boolean(fieldErrors.customerEmail)}
                      placeholder="e.g. fatima@example.bh"
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                    {fieldErrors.customerEmail && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.customerEmail}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="checkout-phone" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.phone} *
                    </label>
                    <div className="flex items-stretch">
                      <span className="bg-[var(--surface-page)] border border-e-0 border-[var(--line)] px-3 min-h-[44px] flex items-center text-xs font-semibold text-[var(--text-body)] rounded-s-md">
                        +973
                      </span>
                      <input
                        id="checkout-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        required
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          clearFieldError('customerPhone');
                        }}
                        aria-invalid={Boolean(fieldErrors.customerPhone)}
                        placeholder="3900 1234"
                        className="token-input w-full min-h-[44px] px-3 py-2 border rounded-e-md text-base sm:text-xs"
                      />
                    </div>
                    {fieldErrors.customerPhone && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.customerPhone}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Bahrain Delivery Address */}
              <div className="bg-[var(--surface-card)] p-5 sm:p-8 rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--maroon-700)] text-[var(--text-on-maroon)] text-xs font-bold flex items-center justify-center">2</span>
                  <h2 className="font-heading text-lg font-semibold text-[var(--maroon-700)]">
                    {t.checkout.step2Title}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-building" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.building} *
                    </label>
                    <input
                      id="checkout-building"
                      type="text"
                      autoComplete="address-line1"
                      required
                      value={buildingNumber}
                      onChange={(e) => {
                        setBuildingNumber(e.target.value);
                        clearFieldError('buildingNumber');
                      }}
                      aria-invalid={Boolean(fieldErrors.buildingNumber)}
                      placeholder="Villa 24 / Apt 4B"
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                    {fieldErrors.buildingNumber && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.buildingNumber}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="checkout-road" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.road} *
                    </label>
                    <input
                      id="checkout-road"
                      type="text"
                      autoComplete="address-line2"
                      required
                      value={roadNumber}
                      onChange={(e) => {
                        setRoadNumber(e.target.value);
                        clearFieldError('roadNumber');
                      }}
                      aria-invalid={Boolean(fieldErrors.roadNumber)}
                      placeholder="Road 3812"
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                    {fieldErrors.roadNumber && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.roadNumber}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="checkout-block" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.block} *
                    </label>
                    <input
                      id="checkout-block"
                      type="text"
                      inputMode="numeric"
                      required
                      value={blockNumber}
                      onChange={(e) => {
                        setBlockNumber(e.target.value);
                        clearFieldError('blockNumber');
                      }}
                      aria-invalid={Boolean(fieldErrors.blockNumber)}
                      placeholder="Block 338"
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                    {fieldErrors.blockNumber && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.blockNumber}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="checkout-area" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.area} *
                    </label>
                    <input
                      id="checkout-area"
                      type="text"
                      autoComplete="address-level2"
                      required
                      value={area}
                      onChange={(e) => {
                        setArea(e.target.value);
                        clearFieldError('area');
                      }}
                      aria-invalid={Boolean(fieldErrors.area)}
                      placeholder="e.g. Adliya, Seef, Saar, Amwaj, Riffa"
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                    {fieldErrors.area && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.area}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="checkout-city" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.city} *
                    </label>
                    <input
                      id="checkout-city"
                      type="text"
                      autoComplete="address-level1"
                      required
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        clearFieldError('city');
                      }}
                      aria-invalid={Boolean(fieldErrors.city)}
                      placeholder="Manama"
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                    {fieldErrors.city && (
                      <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.city}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-3">
                    <label htmlFor="checkout-notes" className="font-semibold text-[var(--text-strong)] block">
                      {t.checkout.additionalNotes}
                    </label>
                    <input
                      id="checkout-notes"
                      type="text"
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="Special gate instructions, doorbell..."
                      className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                    />
                  </div>
                </div>

                {/* Delivery Option Selector */}
                <div className="pt-3 border-t border-[var(--line)] space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-strong)] block uppercase tracking-wider">
                    {t.checkout.deliveryMethod}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label
                      className={`min-h-[48px] p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                        shippingOption === 'standard'
                          ? 'bg-[var(--surface-champagne)] border-[var(--maroon-700)] font-semibold text-[var(--maroon-700)]'
                          : 'bg-[var(--surface-card)] border-[var(--line)] text-[var(--text-body)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shippingOption"
                          checked={shippingOption === 'standard'}
                          onChange={() => setShippingOption('standard')}
                          className="accent-[var(--maroon-700)] w-4 h-4"
                        />
                        <span>{language === 'ar' ? 'توصيل عادي (١-٢ يوم)' : 'Standard (1-2 Days)'}</span>
                      </div>
                      <span className="font-bold tabular-nums">
                        {subtotal >= freeDeliveryThreshold
                          ? language === 'ar'
                            ? 'مجاني'
                            : 'FREE'
                          : '1.500 BHD'}
                      </span>
                    </label>

                    <label
                      className={`min-h-[48px] p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                        shippingOption === 'express'
                          ? 'bg-[var(--surface-champagne)] border-[var(--maroon-700)] font-semibold text-[var(--maroon-700)]'
                          : 'bg-[var(--surface-card)] border-[var(--line)] text-[var(--text-body)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shippingOption"
                          checked={shippingOption === 'express'}
                          onChange={() => setShippingOption('express')}
                          className="accent-[var(--maroon-700)] w-4 h-4"
                        />
                        <span>{language === 'ar' ? 'توصيل فوري نفس اليوم' : 'Same-Day Express'}</span>
                      </div>
                      <span className="font-bold tabular-nums">2.500 BHD</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 3: Bahrain Payment Gateway */}
              <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--maroon-700)] text-[var(--text-on-maroon)] text-xs font-bold flex items-center justify-center">3</span>
                  <h2 className="font-heading text-lg font-semibold text-[var(--maroon-700)]">
                    {t.checkout.step3Title}
                  </h2>
                </div>

                {/* Method Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {/* Visa / Mastercard */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('visa_mastercard')}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      paymentMethod === 'visa_mastercard'
                        ? 'border-[var(--maroon-700)] bg-[var(--surface-champagne)] ring-1 ring-[var(--maroon-700)]'
                        : 'border-[var(--line)] bg-[var(--surface-card)] hover:bg-[var(--surface-page)]'
                    }`}
                  >
                    <div className="font-black italic text-xs text-[var(--maroon-700)]">VISA / MC</div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                      {language === 'ar' ? 'بطاقة الائتمان' : 'Card'}
                    </span>
                  </button>

                  {/* Pay on Delivery */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_delivery')}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      paymentMethod === 'pay_on_delivery'
                        ? 'border-[var(--maroon-700)] bg-[var(--surface-champagne)] ring-1 ring-[var(--maroon-700)]'
                        : 'border-[var(--line)] bg-[var(--surface-card)] hover:bg-[var(--surface-page)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--maroon-700)] flex items-center justify-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>POD</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                      {language === 'ar' ? 'عند الاستلام' : 'On Delivery'}
                    </span>
                  </button>
                </div>

                {/* Payment Provider Details Box */}
                <div className="p-4 bg-[var(--surface-page)] rounded-lg border border-[var(--line)]">
                  {/* Pay on Delivery Interface */}
                  {paymentMethod === 'pay_on_delivery' && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--line)] shadow-xs text-[var(--maroon-700)]">
                          <Truck className="w-8 h-8 text-[var(--maroon-700)]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-[var(--text-strong)]">
                            {t.checkout.payOnDelivery}
                          </p>
                          <p className="text-[11px] text-[var(--text-body)] leading-relaxed">
                            {t.checkout.payOnDeliveryDesc}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[var(--surface-card)] rounded-lg border border-[var(--gold-decor)]/60 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-[var(--gold-text)] gold-text-rtl-weight font-semibold">
                          <ShieldCheck className="w-4 h-4" />
                          <span>{language === 'ar' ? 'آلية التحقق برمز السداد ورمز QR:' : '6-Digit Code & QR Verification Protocol:'}</span>
                        </div>
                        <ul className="list-disc pl-4 rtl:pl-0 rtl:pr-4 text-[11px] text-[var(--text-body)] space-y-1">
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
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-cc-holder" className="font-semibold text-[var(--text-strong)] block">
                          {t.checkout.cardHolder}
                        </label>
                        <input
                          id="checkout-cc-holder"
                          type="text"
                          autoComplete="cc-name"
                          value={cardHolder}
                          onChange={(e) => {
                            setCardHolder(e.target.value);
                            clearFieldError('cardHolder');
                          }}
                          aria-invalid={Boolean(fieldErrors.cardHolder)}
                          className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md font-mono uppercase text-base sm:text-xs"
                        />
                        {fieldErrors.cardHolder && (
                          <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.cardHolder}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="checkout-cc-number" className="font-semibold text-[var(--text-strong)] block">
                          {t.checkout.cardNumber}
                        </label>
                        <input
                          id="checkout-cc-number"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={cardNumber}
                          onChange={(e) => {
                            setCardNumber(e.target.value);
                            clearFieldError('cardNumber');
                          }}
                          aria-invalid={Boolean(fieldErrors.cardNumber)}
                          className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md font-mono text-base sm:text-xs"
                        />
                        {fieldErrors.cardNumber && (
                          <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.cardNumber}</span>
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label htmlFor="checkout-cc-exp" className="font-semibold text-[var(--text-strong)] block">
                            {t.checkout.expiry}
                          </label>
                          <input
                            id="checkout-cc-exp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            value={cardExpiry}
                            onChange={(e) => {
                              setCardExpiry(e.target.value);
                              clearFieldError('cardExpiry');
                            }}
                            aria-invalid={Boolean(fieldErrors.cardExpiry)}
                            className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md font-mono text-base sm:text-xs"
                          />
                          {fieldErrors.cardExpiry && (
                            <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{fieldErrors.cardExpiry}</span>
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="checkout-cc-cvv" className="font-semibold text-[var(--text-strong)] block">
                            {t.checkout.cvv}
                          </label>
                          <input
                            id="checkout-cc-cvv"
                            type="password"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => {
                              setCardCvv(e.target.value);
                              clearFieldError('cardCvv');
                            }}
                            aria-invalid={Boolean(fieldErrors.cardCvv)}
                            className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md font-mono text-base sm:text-xs"
                          />
                          {fieldErrors.cardCvv && (
                            <p role="alert" className="text-xs font-medium text-[var(--red-600)] flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{fieldErrors.cardCvv}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Error Alert */}
                {paymentError && (
                  <div role="alert" className="p-3 bg-[var(--surface-blush)] border border-[var(--red-600)] rounded-lg flex items-center gap-2 text-xs text-[var(--red-600)] font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

              </div>

            </div>

            {/* Right Column: Order Summary & Pay CTA */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs space-y-6 sticky top-28">
                
                <h2 className="font-heading text-xl font-semibold text-[var(--maroon-700)] border-b border-[var(--line)] pb-3">
                  {t.orderConfirmation.orderSummary} ({cart.length})
                </h2>

                {/* Items Preview */}
                <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-[var(--line)] pe-1">
                  {cart.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={(item.product.images?.[0] && item.product.images[0].trim() !== '') ? item.product.images[0] : '/images/hero_pic.jpeg'}
                          alt=""
                          className="w-12 h-14 object-cover rounded-xs border border-[var(--line)]"
                        />
                        <div>
                          <p className="font-semibold text-[var(--text-strong)] line-clamp-1">
                            {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {item.size} · {item.color} · Qty {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-[var(--text-strong)] tabular-nums shrink-0">
                        {formatBHD(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="space-y-2 border-t border-[var(--line)] pt-4 text-xs text-[var(--text-body)]">
                  <div className="flex justify-between">
                    <span>{t.cart.subtotal}</span>
                    <span className="font-semibold text-[var(--text-strong)] tabular-nums">{formatBHD(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--maroon-700)]">
                      <span>{t.cart.discount} ({appliedCoupon?.code})</span>
                      <span className="font-bold tabular-nums">-{formatBHD(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>{t.cart.shipping}</span>
                    <span className="font-semibold text-[var(--text-strong)] tabular-nums">
                      {shippingFee === 0 ? (
                        <span className="text-[var(--gold-text)] gold-text-rtl-weight font-bold">
                          {language === 'ar' ? 'مجاني' : 'FREE'}
                        </span>
                      ) : (
                        formatBHD(shippingFee)
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[var(--line)] flex justify-between text-base font-bold text-[var(--text-strong)]">
                    <span>{t.cart.total}</span>
                    <span className="text-xl text-[var(--maroon-700)] tabular-nums">{formatBHD(total)}</span>
                  </div>
                </div>

                {/* Option to send customer receipt */}
                <div className="p-3 bg-[var(--surface-champagne)]/70 border border-[var(--gold-decor)]/50 rounded-lg space-y-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={sendReceiptViaEmail}
                      onChange={(e) => setSendReceiptViaEmail(e.target.checked)}
                      className="mt-0.5 rounded-xs accent-[var(--maroon-700)]"
                    />
                    <div>
                      <span className="font-semibold text-[var(--text-strong)] block">
                        {t.checkout.sendReceiptOption}
                      </span>
                      <span className="text-[10px] text-[var(--text-body)] block leading-tight mt-0.5">
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
                    className="w-full py-4 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold text-xs uppercase tracking-wider rounded-[var(--radius-pill)] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-[var(--gold-decor)]/50 group"
                  >
                    <Lock className="w-4 h-4 text-[var(--surface-champagne)] group-hover:scale-110 transition-transform" />
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
                    className="w-full py-4 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold text-xs uppercase tracking-wider rounded-[var(--radius-pill)] shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                        <ShieldCheck className="w-4 h-4 text-[var(--surface-champagne)]" />
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
                  className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--maroon-700)] underline cursor-pointer"
                >
                  {t.cart.continueShopping}
                </button>

                {/* Trust Seal */}
                <div className="pt-3 border-t border-[var(--line)] text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                  <ShieldCheck className="w-4 h-4 mx-auto text-[var(--gold-text)] mb-1" />
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
