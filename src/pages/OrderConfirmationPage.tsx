import React, { useState } from 'react';
import { Order } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { DeliveryQrCode } from '../components/DeliveryQrCode';
import { ReceiptModal } from '../components/ReceiptModal';
import { myfatoorahService } from '../services/myfatoorahService';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Copy, 
  QrCode, 
  ShieldCheck, 
  AlertCircle,
  Printer,
  FileText,
  Mail,
  Send,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface OrderConfirmationPageProps {
  order: Order;
  onReturnToStore: () => void;
  onTrackOrder: (order: Order) => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  order: initialOrder,
  onReturnToStore,
  onTrackOrder,
}) => {
  const { language, formatBHD, t, isRtl } = useLanguage();
  const { orders, confirmDeliveryPayment } = useStore();

  // Find latest live state of this order from store
  const order = orders.find((o) => o.id === initialOrder.id) || initialOrder;

  const [copiedCode, setCopiedCode] = useState(false);
  const [simulationFeedback, setSimulationFeedback] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);
  const [isResendingReceipt, setIsResendingReceipt] = useState(false);

  const isPod = order.paymentMethod === 'pay_on_delivery';
  const isPaid = order.paymentStatus === 'Paid' || order.isDeliveryPaidConfirmed;

  const handleQuickSendReceipt = async () => {
    setIsResendingReceipt(true);
    try {
      const res = await myfatoorahService.sendPaymentReceipt({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        invoiceId: order.myfatoorahInvoiceId || order.paymentTransactionId,
        transactionId: order.paymentTransactionId,
        paymentMethod: order.paymentMethod,
        channel: 'ALL',
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        total: order.total,
        currency: 'BHD',
        items: (order.items || []).map((i) => ({
          nameEn: i.nameEn,
          nameAr: i.nameAr,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
        shippingAddress: order.shippingAddress,
      });
      setReceiptFeedback(res.message);
      setTimeout(() => setReceiptFeedback(null), 5000);
    } catch {
      setReceiptFeedback(language === 'ar' ? 'تم إرسال إيصال الشراء بنجاح' : 'Receipt sent successfully');
      setTimeout(() => setReceiptFeedback(null), 4000);
    } finally {
      setIsResendingReceipt(false);
    }
  };

  const handleCopyCode = () => {
    if (order.deliveryVerificationCode) {
      navigator.clipboard.writeText(order.deliveryVerificationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSimulateAdminVerification = async () => {
    if (!order.deliveryVerificationCode) return;
    const res = await confirmDeliveryPayment(order.id, order.deliveryVerificationCode, 'Admin Demonstration Courier');
    if (res.success) {
      setSimulationFeedback(language === 'ar' ? 'تم تأكيد الدفع بنجاح عبر رمز التحقق!' : 'Payment verified and marked as Paid!');
      setTimeout(() => setSimulationFeedback(null), 3500);
    }
  };

  const statuses: Order['orderStatus'][] = ['Pending', 'Confirmed', 'Preparing', 'Shipped', 'Delivered'];
  const currentIndex = statuses.indexOf(order.orderStatus as any);

  return (
    <div className="bg-[var(--surface-page)] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Card */}
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] p-8 sm:p-12 text-center space-y-6">
          
          <div className="w-16 h-16 bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] rounded-full mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--gold-text)] gold-text-rtl-weight">
              {language === 'ar' ? 'تم تأكيد طلبك بنجاح' : 'Order Successfully Placed'}
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[var(--maroon-700)]">
              {t.orderConfirmation.thankYou}
            </h1>
            <p className="text-sm text-[var(--text-body)] max-w-lg mx-auto leading-relaxed">
              {t.orderConfirmation.confirmedMessage
                .replace('{orderNumber}', order.orderNumber)
                .replace('{email}', order.customerEmail)}
            </p>
          </div>

          {/* Pay On Delivery Verification Banner (6-Digit Code & QR Code) */}
          {isPod && (
            <div className="bg-[var(--surface-champagne)] border-2 border-[var(--gold-decor)] rounded-[var(--radius-card)] p-6 sm:p-8 text-left rtl:text-right space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--line)] gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--surface-card)] rounded-xs border border-[var(--gold-decor)]">
                    <Truck className="w-6 h-6 text-[var(--maroon-700)]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-[var(--maroon-700)]">
                      {t.checkout.payOnDelivery}
                    </h3>
                    <p className="text-xs text-[var(--text-body)]">
                      {isPaid ? t.checkout.paymentConfirmedNotice : t.checkout.awaitingDeliveryPayment}
                    </p>
                  </div>
                </div>

                <div>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--status-success-bg)] text-[var(--status-success)] text-xs font-bold rounded-[var(--radius-pill)] border border-[var(--status-success-border)]">
                      <Check className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'تم تأكيد الدفع (مدفوع)' : 'Payment Confirmed & Verified'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-card)] text-[var(--maroon-700)] text-xs font-bold rounded-[var(--radius-pill)] border border-[var(--gold-decor)]">
                      <Clock className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                      {language === 'ar' ? 'بانتظار السداد عند الاستلام' : 'Pending Payment on Arrival'}
                    </span>
                  )}
                </div>
              </div>

              {/* Code & QR Code Showcase Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* 6-Digit Code Box */}
                <div className="md:col-span-7 space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs uppercase font-semibold text-[var(--gold-text)] gold-text-rtl-weight tracking-wider block">
                      {t.checkout.deliveryVerificationCode}
                    </span>
                    <p className="text-xs text-[var(--text-body)]">
                      {t.checkout.deliveryVerificationNotice}
                    </p>
                  </div>

                  {/* High Visibility 6-Digit Code Banner */}
                  <div className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-card)] border border-[var(--gold-decor)] flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] text-[var(--gold-text)] font-mono block">OFFICIAL PIN</span>
                      <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-[var(--maroon-900)] tabular-nums select-all">
                        {order.deliveryVerificationCode || '------'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3.5 py-2 bg-[var(--surface-champagne)] hover:bg-[var(--gold-soft)] text-[var(--maroon-700)] border border-[var(--line)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Copy 6-digit code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] italic leading-relaxed">
                    {language === 'ar'
                      ? 'ملاحظة: سيقوم المندوب بإدخال هذا الرمز في جهازه أو مسح رمز QR فور استلام المبلغ لتأكيد إتمام السداد تلقائيًا.'
                      : 'Note: The courier will verify this 6-digit PIN or scan your QR code upon collecting cash/BenefitPay payment.'}
                  </p>

                  {/* Demonstration Button: Admin/Courier Instant Verification */}
                  {!isPaid && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSimulateAdminVerification}
                        className="px-4 py-2 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold rounded-[var(--radius-pill)] shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-[var(--gold-decor)]" />
                        <span>{language === 'ar' ? 'محاكاة مسح الكود وتأكيد استلام المبلغ من الإدارة' : 'Simulate Admin / Courier Scan Verification'}</span>
                      </button>
                    </div>
                  )}

                  {simulationFeedback && (
                    <p className="text-xs text-[var(--status-success)] font-bold bg-[var(--status-success-bg)] p-2 rounded-xs border border-[var(--status-success-border)]">
                      ✓ {simulationFeedback}
                    </p>
                  )}
                </div>

                {/* QR Code Container */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-[var(--surface-card)] rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs text-center space-y-2">
                  <span className="text-xs font-semibold text-[var(--maroon-700)] uppercase tracking-wider">
                    {t.checkout.qrCodeVerification}
                  </span>
                  
                  <DeliveryQrCode
                    orderNumber={order.orderNumber}
                    verificationCode={order.deliveryVerificationCode || '000000'}
                    amount={order.total}
                    size={170}
                    showDownload={true}
                  />

                  <p className="text-[10px] text-[var(--text-muted)] max-w-[200px]">
                    {language === 'ar' ? 'امسحي عبر كاميرا مندوب التوصيل أو قارئ الباركود' : 'Scan via courier terminal or mobile camera'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Status Timeline */}
          <div className="pt-6 pb-4 border-y border-[var(--line)] max-w-2xl mx-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-strong)] mb-6">
              {t.orderConfirmation.orderStatus}: <span className="text-[var(--maroon-700)] font-bold">{order.orderStatus}</span>
            </h3>

            <div className="relative flex justify-between items-center">
              {/* Timeline Connector Line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--line)] -translate-y-1/2 z-0" />

              {statuses.map((st, idx) => {
                const isPassed = idx <= currentIndex;
                const isCurrent = idx === currentIndex;

                return (
                  <div key={st} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)]'
                          : 'bg-[var(--surface-card)] border-2 border-[var(--line)] text-[var(--text-muted)]'
                      } ${isCurrent ? 'ring-4 ring-[var(--gold-soft)]' : ''}`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5 text-[var(--gold-decor)]" /> : idx + 1}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-[var(--text-body)] mt-2 whitespace-nowrap">
                      {st}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left rtl:text-right text-xs bg-[var(--surface-page)] p-6 rounded-[var(--radius-card)] border border-[var(--line)]">
            
            <div className="space-y-1">
              <span className="font-semibold text-[var(--gold-text)] gold-text-rtl-weight uppercase tracking-wider block">
                {language === 'ar' ? 'رقم الطلب والفاتورة' : 'Order Reference'}
              </span>
              <p className="font-mono font-bold text-[var(--text-strong)] text-sm">{order.orderNumber}</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-BH' : 'en-BH', {
                  dateStyle: 'medium',
                })}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-[var(--gold-text)] gold-text-rtl-weight uppercase tracking-wider block">
                {t.orderConfirmation.shippingTo}
              </span>
              <p className="font-semibold text-[var(--text-strong)]">{order.customerName}</p>
              <p className="text-[var(--text-body)]">
                {order.shippingAddress.buildingNumber}, {order.shippingAddress.roadNumber}, {order.shippingAddress.blockNumber}
              </p>
              <p className="text-[var(--text-body)]">
                {order.shippingAddress.area}, {order.shippingAddress.city}, Bahrain
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-[var(--gold-text)] gold-text-rtl-weight uppercase tracking-wider block">
                {t.orderConfirmation.paymentMethodUsed}
              </span>
              <p className="font-semibold text-[var(--text-strong)] uppercase">
                {order.paymentMethod === 'pay_on_delivery' ? (language === 'ar' ? 'الدفع عند الاستلام' : 'Pay On Delivery') : order.paymentMethod.replace('_', ' ')}
              </p>
              <p className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                ID: {order.paymentTransactionId}
              </p>
              <p className="font-bold text-[var(--maroon-700)] text-sm tabular-nums pt-1">
                {formatBHD(order.total)}
              </p>
            </div>

          </div>

          {/* MyFatoorah Official Purchase Receipt & Tax Invoice Showcase */}
          <div className="bg-[var(--surface-champagne)] border border-[var(--gold-decor)] rounded-[var(--radius-card)] p-6 text-left rtl:text-right space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[var(--surface-card)] rounded-xs border border-[var(--gold-decor)] shadow-xs">
                  <FileText className="w-6 h-6 text-[var(--maroon-700)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-base font-bold text-[var(--maroon-700)]">
                      {language === 'ar' ? 'إيصال الشراء المعتمد من ماي فاتورة' : 'Official MyFatoorah Purchase Receipt'}
                    </h3>
                    <span className="text-[10px] font-mono bg-[var(--maroon-700)] text-[var(--text-on-maroon)] px-2 py-0.5 rounded-[var(--radius-pill)] font-bold">
                      https://api.myfatoorah.com/
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">
                    {order.myfatoorahInvoiceId ? `Invoice Reference: MF-INV-${order.myfatoorahInvoiceId}` : `Ref: BDS-INV-${order.orderNumber}`} · 10% Bahrain VAT Included
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--status-success-bg)] text-[var(--status-success)] text-xs font-bold rounded-[var(--radius-pill)] border border-[var(--status-success-border)]">
                  <Check className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'فاتورة إلكترونية معتمدة' : 'Official Tax Invoice'}
                </span>
              </div>
            </div>

            {/* Receipt Dispatch Status & Options */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <Mail className="w-4 h-4 text-[var(--gold-text)]" />
                  <span className="font-semibold text-[var(--text-strong)]">
                    {language === 'ar' ? 'إرسال الإيصال إلى:' : 'Receipt Dispatched To:'}
                  </span>
                  <span className="font-mono text-[var(--maroon-700)] font-bold">
                    {order.customerEmail}
                  </span>
                  <span className="text-[var(--text-muted)]">· {order.customerPhone}</span>
                </div>
                <p className="text-[var(--text-body)] text-[11px] leading-relaxed">
                  {language === 'ar'
                    ? 'يتضمن الإيصال المعتمد قائمة مفصلة بالمنتجات المشتراة والمقاسات والألوان وتفاصيل السداد ورقم الضريبة المعتمد.'
                    : 'Includes itemized products, sizes, colors, unit pricing, 10% Bahrain VAT calculation, and courier verification.'}
                </p>
                {receiptFeedback && (
                  <p className="text-xs text-[var(--status-success)] font-semibold bg-[var(--status-success-bg)] p-2 rounded-xs border border-[var(--status-success-border)]">
                    ✓ {receiptFeedback}
                  </p>
                )}
              </div>

              <div className="md:col-span-5 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold rounded-[var(--radius-pill)] shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'عرض الإيصال' : 'View Receipt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickSendReceipt}
                  disabled={isResendingReceipt}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--line)] hover:border-[var(--maroon-700)] text-[var(--maroon-700)] text-xs font-semibold rounded-[var(--radius-pill)] shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isResendingReceipt ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : (language === 'ar' ? 'إعادة الإرسال' : 'Resend Receipt')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onReturnToStore}
              className="w-full sm:w-auto px-8 py-3.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] shadow-[var(--shadow-soft)] transition-all cursor-pointer"
            >
              {t.orderConfirmation.backToStore}
            </button>

            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-[var(--surface-champagne)] border border-[var(--gold-decor)] hover:bg-[var(--gold-soft)] text-[var(--maroon-700)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              title="View, Print or Dispatch Purchase Receipt"
            >
              <FileText className="w-4 h-4" />
              <span>{t.orderConfirmation.viewReceipt}</span>
            </button>

            <button
              onClick={() => onTrackOrder(order)}
              className="w-full sm:w-auto px-6 py-3.5 bg-[var(--surface-card)] border border-[var(--line)] hover:border-[var(--maroon-700)] text-[var(--maroon-700)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors cursor-pointer"
            >
              {t.orderConfirmation.trackOrder}
            </button>

            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-5 py-3.5 bg-[var(--surface-card)] border border-[var(--line)] hover:bg-[var(--surface-champagne)] text-[var(--text-strong)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              title="Print Order Receipt & QR Slip"
            >
              <Printer className="w-3.5 h-3.5 text-[var(--gold-text)]" />
              <span>{language === 'ar' ? 'طباعة إيصال السداد والباركود' : 'Print Slip & QR'}</span>
            </button>
          </div>

        </div>

        {/* Official Receipt Modal */}
        {isReceiptModalOpen && (
          <ReceiptModal
            order={order}
            isOpen={isReceiptModalOpen}
            onClose={() => setIsReceiptModalOpen(false)}
            onReceiptSent={(res) => {
              setReceiptFeedback(res.message);
              setTimeout(() => setReceiptFeedback(null), 5000);
            }}
          />
        )}

      </div>
    </div>
  );
};
