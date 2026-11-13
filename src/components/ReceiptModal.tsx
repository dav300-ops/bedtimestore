import React, { useState } from 'react';
import { Order } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { myfatoorahService, ReceiptDispatchResult } from '../services/myfatoorahService';
import { DeliveryQrCode } from './DeliveryQrCode';
import {
  X,
  Printer,
  Mail,
  Send,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Download,
  Share2,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ReceiptModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onReceiptSent?: (result: ReceiptDispatchResult) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  onReceiptSent,
}) => {
  const { language, formatBHD, t } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'view' | 'email' | 'sms'>('view');
  const [recipientEmail, setRecipientEmail] = useState(order.customerEmail);
  const [recipientPhone, setRecipientPhone] = useState(order.customerPhone);
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<ReceiptDispatchResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleSendEmailReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;
    setIsSending(true);

    try {
      const result = await myfatoorahService.sendPaymentReceipt({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: recipientEmail,
        customerPhone: recipientPhone,
        invoiceId: order.myfatoorahInvoiceId || order.paymentTransactionId,
        transactionId: order.paymentTransactionId,
        paymentMethod: order.paymentMethod,
        channel: 'EMAIL',
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
        notes: customNote,
      });

      setDispatchResult(result);
      if (onReceiptSent) onReceiptSent(result);
      setActiveTab('view');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSmsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone) return;
    setIsSending(true);

    try {
      const result = await myfatoorahService.sendPaymentReceipt({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: recipientEmail,
        customerPhone: recipientPhone,
        invoiceId: order.myfatoorahInvoiceId || order.paymentTransactionId,
        transactionId: order.paymentTransactionId,
        paymentMethod: order.paymentMethod,
        channel: 'SMS',
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

      setDispatchResult(result);
      if (onReceiptSent) onReceiptSent(result);
      setActiveTab('view');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyReceiptLink = () => {
    const url = `${window.location.origin}/#/order-confirmation?ref=${order.orderNumber}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate 10% Bahrain VAT breakdown (inclusive)
  const vatAmount = (order.total * 0.1) / 1.1;

  const invoiceNumber = order.myfatoorahInvoiceId
    ? `MF-INV-${order.myfatoorahInvoiceId}`
    : `BDS-INV-${order.orderNumber}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 bg-[var(--scrim-dark)] backdrop-blur-xs">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-card)] max-w-3xl w-full border border-[var(--line)] shadow-[var(--shadow-soft)] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar (Never Printed) */}
        <div className="p-4 bg-[var(--maroon-900)] text-[var(--text-on-maroon)] flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gold-decor)]/40 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--gold-decor)]" />
            <div>
              <h2 className="font-heading text-base font-semibold text-[var(--text-on-maroon)]">
                {isAr ? 'إيصال الشراء المعتمد والفاتورة الإلكترونية' : 'Official Purchase Receipt & Tax Invoice'}
              </h2>
              <p className="text-[11px] text-[var(--surface-champagne)]/80 font-mono">
                {order.orderNumber} · {invoiceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('email')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-pill)] flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border border-[var(--gold-decor)]/60'
                  : 'bg-white/10 hover:bg-white/20 text-[var(--surface-champagne)]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال بريد' : 'Email Receipt'}</span>
            </button>

            <button
              onClick={() => setActiveTab('sms')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-pill)] flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'sms'
                  ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border border-[var(--gold-decor)]/60'
                  : 'bg-white/10 hover:bg-white/20 text-[var(--surface-champagne)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال SMS' : 'SMS Receipt'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] border border-[var(--gold-decor)]/50 text-[var(--text-on-maroon)] text-xs font-semibold rounded-[var(--radius-pill)] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Receipt / Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAr ? 'طباعة / PDF' : 'Print / PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-[var(--surface-champagne)]/80 hover:text-[var(--text-on-maroon)] p-1 rounded-full hover:bg-white/10 ml-2 rtl:ml-0 rtl:mr-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dispatch Confirmation Banner */}
        {dispatchResult && (
          <div className="p-3.5 bg-[var(--status-success-bg)] border-b border-[var(--status-success-border)] text-xs text-[var(--status-success)] flex items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0" />
              <span>{dispatchResult.message}</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--status-success)] bg-[var(--surface-card)] border border-[var(--status-success-border)] px-2 py-0.5 rounded-xs shrink-0">
              {dispatchResult.receiptNumber}
            </span>
          </div>
        )}

        {/* Tab 1: Dispatch via Email Sub-sheet */}
        {activeTab === 'email' && (
          <div className="p-5 bg-[var(--surface-champagne)]/60 border-b border-[var(--line)] print:hidden">
            <form onSubmit={handleSendEmailReceipt} className="max-w-xl mx-auto space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[var(--text-strong)] flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[var(--gold-text)]" />
                  <span>{isAr ? 'إرسال إيصال الشراء إلى البريد الإلكتروني للعميل' : 'Send Purchase Receipt via Email'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="text-[var(--text-muted)] hover:text-[var(--maroon-700)] text-xs cursor-pointer"
                >
                  ✕ {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-strong)]">
                  {isAr ? 'البريد الإلكتروني للمستلم *' : 'Recipient Email Address *'}
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="token-input w-full px-3 py-2 border rounded-xs text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-strong)]">
                  {isAr ? 'رسالة شكر بوتيكية مخصصة (اختياري)' : 'Custom Thank-You Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={isAr ? 'شكراً لتسوقكِ معنا في ذا بدتايم ستور...' : 'Thank you for choosing The Bedtime Store Luxury Boutique...'}
                  className="token-input w-full px-3 py-2 border rounded-xs text-xs"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold rounded-[var(--radius-pill)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? (isAr ? 'جارٍ الإرسال...' : 'Dispatching...') : (isAr ? 'إرسال الإيصال الآن' : 'Dispatch Email Receipt')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--line)] text-[var(--text-body)] hover:border-[var(--maroon-700)] rounded-[var(--radius-pill)] cursor-pointer"
                >
                  {isAr ? 'عرض الإيصال' : 'View Receipt'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Dispatch via SMS Sub-sheet */}
        {activeTab === 'sms' && (
          <div className="p-5 bg-[var(--surface-champagne)]/60 border-b border-[var(--line)] print:hidden">
            <form onSubmit={handleSendSmsReceipt} className="max-w-xl mx-auto space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[var(--text-strong)] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[var(--gold-text)]" />
                  <span>{isAr ? 'إرسال رابط الإيصال الإلكتروني عبر رسالة نصية SMS' : 'Send Receipt Link via SMS (+973)'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="text-[var(--text-muted)] hover:text-[var(--maroon-700)] text-xs cursor-pointer"
                >
                  ✕ {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-strong)]">
                  {isAr ? 'رقم هاتف العميل في البحرين *' : 'Bahrain Mobile Number (+973) *'}
                </label>
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+973 3922 1144"
                  className="token-input w-full px-3 py-2 border rounded-xs text-xs"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold rounded-[var(--radius-pill)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? (isAr ? 'جارٍ الإرسال...' : 'Sending SMS...') : (isAr ? 'إرسال رسالة SMS' : 'Dispatch SMS Receipt')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--line)] text-[var(--text-body)] hover:border-[var(--maroon-700)] rounded-[var(--radius-pill)] cursor-pointer"
                >
                  {isAr ? 'عرض الإيصال' : 'View Receipt'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Printable & Viewable Official Boutique Receipt Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 text-[var(--text-strong)]">
          
          {/* Receipt Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-[var(--line)] gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--gold-text)] gold-text-rtl-weight">
                {isAr ? 'مملكة البحرين · متجر ذا بدتايم ستور' : 'Kingdom of Bahrain · The Bedtime Store'}
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[var(--maroon-700)]">
                THE BEDTIME STORE
              </h1>
              <p className="text-[11px] text-[var(--text-body)]">
                Luxury Sleepwear & Nightwear Boutique · CR: 104928-1 Manama, Kingdom of Bahrain
              </p>
              <p className="text-[11px] text-[var(--text-body)]">
                VAT Registration No: 200018492000003 · Certified Central Bank of Bahrain Retailer
              </p>
            </div>

            {/* MyFatoorah & Verification Badge */}
            <div className="bg-[var(--surface-champagne)] p-3.5 rounded-[var(--radius-card)] border border-[var(--line)] text-left rtl:text-right space-y-1 sm:max-w-xs w-full sm:w-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-[var(--gold-text)] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-success)]" />
                  <span>MyFatoorah Gateway</span>
                </span>
                <span className="text-[10px] font-bold bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] px-2 py-0.5 rounded-xs">
                  {order.paymentStatus === 'Paid' ? (isAr ? 'مدفوع ومعتمد' : 'PAID & SETTLED') : order.paymentStatus}
                </span>
              </div>
              <p className="font-mono text-xs font-bold text-[var(--text-strong)]">
                {invoiceNumber}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] font-mono">
                TXN: {order.paymentTransactionId}
              </p>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            {/* Column 1: Order & Date */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[var(--gold-text)] tracking-wider block">
                {isAr ? 'تفاصيل الطلب والفاتورة' : 'Order & Invoice Info'}
              </span>
              <p><strong>{isAr ? 'رقم الطلب:' : 'Order Number:'}</strong> <span className="font-mono font-bold">{order.orderNumber}</span></p>
              <p><strong>{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</strong> {new Date(order.createdAt).toLocaleString()}</p>
              <p>
                <strong>{isAr ? 'بوابة الدفع:' : 'Payment Gateway:'}</strong>{' '}
                <span className="capitalize font-semibold text-[var(--maroon-700)]">
                  {order.paymentMethod === 'myfatoorah'
                    ? 'MyFatoorah (Benefit / KNET / Cards)'
                    : order.paymentMethod.replace('_', ' ')}
                </span>
              </p>
            </div>

            {/* Column 2: Customer */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[var(--gold-text)] tracking-wider block">
                {isAr ? 'بيانات العميل' : 'Boutique Client'}
              </span>
              <p className="font-bold text-sm text-[var(--text-strong)]">{order.customerName}</p>
              <p className="text-[var(--text-body)]">{order.customerEmail}</p>
              <p className="text-[var(--text-body)] font-mono">{order.customerPhone}</p>
            </div>

            {/* Column 3: Shipping Address */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[var(--gold-text)] tracking-wider block">
                {isAr ? 'عنوان التوصيل' : 'Delivery Destination'}
              </span>
              <p className="font-medium text-[var(--text-strong)]">
                {order.shippingAddress.buildingNumber}, {order.shippingAddress.roadNumber}
              </p>
              <p className="text-[var(--text-body)]">
                Block {order.shippingAddress.blockNumber}, {order.shippingAddress.area}
              </p>
              <p className="text-[var(--text-body)]">
                {order.shippingAddress.city}, Kingdom of Bahrain
              </p>
            </div>
          </div>

          {/* Purchased Products Table */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-[var(--maroon-700)]">
              {isAr ? 'القطع والمنتجات المشتراة' : 'Purchased Boutique Items'}
            </h3>

            <div className="border border-[var(--line)] rounded-[var(--radius-card)] overflow-hidden">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-[var(--surface-champagne)] text-[var(--gold-text)] uppercase font-bold text-[10px] border-b border-[var(--line)]">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'المنتج' : 'Item Description'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'المقاس واللون' : 'Size & Color'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left">{isAr ? 'السعر' : 'Unit Price'}</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left">{isAr ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface-page)] transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.nameEn}
                                className="w-10 h-10 object-cover rounded-xs border border-[var(--line)] shrink-0"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-[var(--text-strong)]">
                                {isAr ? item.nameAr : item.nameEn}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] font-mono">
                                SKU: BDS-{item.productId.slice(-5).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-semibold bg-[var(--surface-lavender)] text-[var(--maroon-700)] px-2 py-0.5 rounded-xs text-[11px]">
                            {item.size}
                          </span>
                          <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">{item.color}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-3 px-3 text-right rtl:text-left tabular-nums text-[var(--text-body)]">
                          {formatBHD(item.unitPrice)}
                        </td>
                        <td className="py-3 px-3 text-right rtl:text-left tabular-nums font-bold text-[var(--text-strong)]">
                          {formatBHD(item.totalPrice)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 px-3 text-center text-[var(--text-muted)]">
                        {isAr ? 'طلب بوتيك فاخر من تشكيلة ذا بدتايم ستور' : 'Boutique Sleepwear Curated Order'} · {formatBHD(order.total)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & QR Validation */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            
            {/* Left Box: Official MyFatoorah Stamp & QR */}
            <div className="sm:col-span-7 bg-[var(--surface-page)] p-4 rounded-[var(--radius-card)] border border-[var(--line)] flex items-center gap-4">
              <div className="bg-[var(--surface-card)] p-2 rounded-xs border border-[var(--gold-decor)] shrink-0 shadow-2xs">
                <DeliveryQrCode
                  orderNumber={order.orderNumber}
                  verificationCode={order.deliveryVerificationCode || invoiceNumber}
                  amount={order.total}
                  size={95}
                  showDownload={false}
                />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--maroon-700)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                  <span>{isAr ? 'إيصال إلكتروني مشفر معتمد' : 'Verified Cryptographic Invoice'}</span>
                </div>
                <p className="text-[11px] text-[var(--text-body)] leading-relaxed">
                  {isAr
                    ? 'تم توثيق هذه الفاتورة الإلكترونية عبر بوابة ماي فاتورة الرسمية في مملكة البحرين.'
                    : 'Authenticated through MyFatoorah National Gateway under Kingdom of Bahrain commercial retail regulations.'}
                </p>
                {order.paymentMethod === 'pay_on_delivery' && order.deliveryVerificationCode && (
                  <p className="font-mono text-xs font-bold text-[var(--maroon-700)]">
                    DELIVERY PIN: {order.deliveryVerificationCode}
                  </p>
                )}
              </div>
            </div>

            {/* Right Box: Totals & Tax Calculation */}
            <div className="sm:col-span-5 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-[var(--text-body)]">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="tabular-nums font-semibold">{formatBHD(order.subtotal)}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between py-1 text-[var(--status-success)]">
                  <span>{isAr ? 'الخصم الترويجي:' : 'Discount:'}</span>
                  <span className="tabular-nums font-semibold">-{formatBHD(order.discount)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 text-[var(--text-body)]">
                <span>{isAr ? 'رسوم التوصيل في البحرين:' : 'Bahrain Shipping:'}</span>
                <span className="tabular-nums font-semibold">
                  {order.shippingFee === 0 ? (isAr ? 'مجاني' : 'Complimentary') : formatBHD(order.shippingFee)}
                </span>
              </div>

              <div className="flex justify-between py-1 text-[var(--text-muted)] text-[11px] border-t border-[var(--line)] pt-1.5">
                <span>{isAr ? 'ضريبة القيمة المضافة 10% (مشمولة):' : 'VAT (10% Included):'}</span>
                <span className="tabular-nums">{formatBHD(vatAmount)}</span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-[var(--maroon-700)] text-base font-bold text-[var(--text-strong)]">
                <span>{isAr ? 'المبلغ الإجمالي:' : 'Grand Total:'}</span>
                <span className="tabular-nums text-[var(--maroon-700)]">{formatBHD(order.total)}</span>
              </div>
            </div>

          </div>

          {/* Boutique Footer Note */}
          <div className="pt-6 border-t border-[var(--line)] text-center text-[10px] text-[var(--text-muted)] space-y-1">
            <p>
              {isAr
                ? 'شكراً لتسوقكم من ذا بدتايم ستور. نتمنى لكم نوماً هانئاً وأحلاماً سعيدة.'
                : 'Thank you for choosing THE BEDTIME STORE. Wishing you serene nights and sweet dreams.'}
            </p>
            <p>
              Customer Care: concierge@thebedtimestore.bh · Phone: +973 1722 8844 · Moda Mall, Manama, Bahrain
            </p>
          </div>

        </div>

        {/* Footer Actions (Never Printed) */}
        <div className="p-4 bg-[var(--surface-page)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReceiptLink}
              className="px-3 py-2 bg-[var(--surface-card)] border border-[var(--line)] hover:border-[var(--maroon-700)] rounded-[var(--radius-pill)] text-xs font-semibold text-[var(--text-strong)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? (isAr ? 'تم نسخ الرابط!' : 'Link Copied!') : (isAr ? 'نسخ رابط الفاتورة' : 'Copy Receipt Link')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('email')}
              className="px-4 py-2 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] rounded-[var(--radius-pill)] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال الإيصال للعميل' : 'Send Customer Receipt'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--surface-card)] border border-[var(--line)] hover:bg-[var(--surface-champagne)] text-[var(--text-strong)] rounded-[var(--radius-pill)] text-xs font-semibold cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
