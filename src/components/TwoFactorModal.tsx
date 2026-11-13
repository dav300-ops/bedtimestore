import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DeliveryQrCode } from './DeliveryQrCode';
import { ShieldCheck, Copy, Check, Key, Smartphone, AlertTriangle, X } from 'lucide-react';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toggleTwoFactor, currentUser } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [step, setStep] = useState<1 | 2>(1);
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [error, setError] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    setIsSettingUp(true);
    try {
      const res = await toggleTwoFactor(true);
      if (res.success && res.secret) {
        setSecret(res.secret);
        setBackupCodes(res.backupCodes || []);
        setStep(2);
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleComplete = () => {
    if (verificationInput.length < 6) {
      setError(isAr ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام.' : 'Please enter a 6-digit verification code.');
      return;
    }
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--scrim-dark)] backdrop-blur-xs">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-card)] max-w-lg w-full border border-[var(--line)] shadow-[var(--shadow-soft)] overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[var(--maroon-900)] text-[var(--text-on-maroon)] p-5 flex items-center justify-between border-b border-[var(--gold-decor)]/30">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[var(--gold-decor)]" />
            <h3 className="font-heading text-lg font-semibold text-[var(--text-on-maroon)]">
              {isAr ? 'إعداد المصادقة الثنائية (2FA)' : 'Two-Factor Authentication (2FA)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--surface-champagne)]/80 hover:text-[var(--text-on-maroon)] p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-[var(--text-body)]">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--surface-champagne)] rounded-xs border border-[var(--line)] space-y-2">
                <p className="font-semibold text-sm text-[var(--maroon-700)]">
                  {isAr ? 'حماية إضافية لحسابك البوتيكي' : 'Add an Extra Layer of Boutique Security'}
                </p>
                <p className="text-[var(--text-body)] leading-relaxed">
                  {isAr
                    ? 'المصادقة الثنائية تطلب إدخال رمز أمان يتم توليده على هاتفكِ عبر تطبيق المصادقة (Google Authenticator أو 1Password) عند كل تسجيل دخول جديد.'
                    : 'Two-factor authentication requires entering a time-based 6-digit code from your authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password) whenever you sign in.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-[var(--surface-card)] border border-[var(--line)] rounded-xs space-y-1">
                  <Smartphone className="w-5 h-5 text-[var(--gold-text)] mx-auto" />
                  <p className="font-semibold text-[var(--text-strong)]">{isAr ? 'تطبيق الهاتف' : 'Authenticator App'}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Google / Apple / MS</p>
                </div>
                <div className="p-3 bg-[var(--surface-card)] border border-[var(--line)] rounded-xs space-y-1">
                  <Key className="w-5 h-5 text-[var(--gold-text)] mx-auto" />
                  <p className="font-semibold text-[var(--text-strong)]">{isAr ? 'رموز الطوارئ' : 'Backup Codes'}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">6 Single-use Keys</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartSetup}
                disabled={isSettingUp}
                className="w-full py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors shadow-xs cursor-pointer"
              >
                {isSettingUp ? (isAr ? 'جارٍ التهيئة...' : 'Configuring Security...') : (isAr ? 'بدء تفعيل 2FA' : 'Start 2FA Configuration')}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Step 2: Scan QR & Backup Codes */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-[var(--surface-page)] p-4 rounded-xs border border-[var(--line)]">
                <div className="bg-[var(--surface-card)] p-2 rounded-xs border border-[var(--line)] shadow-xs">
                  <DeliveryQrCode
                    orderNumber={currentUser?.email || 'bedtime-user'}
                    verificationCode={secret.slice(-6)}
                    amount={2026}
                    size={110}
                    showDownload={false}
                  />
                </div>
                <div className="space-y-1.5 text-left rtl:text-right flex-1">
                  <p className="font-bold text-xs text-[var(--text-strong)]">
                    {isAr ? '1. امسحي رمز الاستجابة السريعة (QR)' : '1. Scan this QR Code'}
                  </p>
                  <p className="text-[11px] text-[var(--text-body)] leading-normal">
                    {isAr
                      ? 'افتحي تطبيق المصادقة وامسحي الرمز أو أدخلي المفتاح السري يدوياً.'
                      : 'Open your Authenticator app and scan this barcode, or paste the secret key below.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="font-mono text-[11px] bg-[var(--surface-card)] px-2 py-1 border border-[var(--line)] rounded-xs font-semibold text-[var(--text-strong)] select-all">
                      {secret}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1 hover:bg-[var(--surface-champagne)] rounded-xs text-[var(--text-muted)] hover:text-[var(--maroon-700)] cursor-pointer"
                      title="Copy Key"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-[var(--status-success)]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Emergency Backup Codes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-[var(--text-strong)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                    <span>{isAr ? '2. احفظي رموز الاسترداد للطوارئ:' : '2. Save Emergency Backup Codes:'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCodes}
                    className="text-[11px] text-[var(--maroon-700)] hover:text-[var(--maroon-600)] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedCodes ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodes ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرموز' : 'Copy All')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center bg-[var(--surface-page)] p-2.5 rounded-xs border border-[var(--line)]">
                  {backupCodes.map((c, i) => (
                    <span key={i} className="bg-[var(--surface-card)] py-1 rounded-xs border border-[var(--line)] text-[var(--text-strong)]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verification Code from App */}
              <div className="space-y-1">
                <label className="font-semibold text-xs text-[var(--text-strong)]">
                  {isAr ? '3. أدخلي رمز التحقق من تطبيقك للتأكيد (6 أرقام):' : '3. Enter 6-digit code from app to verify:'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationInput}
                  aria-invalid={Boolean(error)}
                  onChange={(e) => {
                    setVerificationInput(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. 492104"
                  className="token-input w-full px-3 py-2 border rounded-xs font-mono tracking-widest text-center text-sm"
                />
                {error && <p role="alert" className="text-[11px] text-[var(--red-600)] font-medium">{error}</p>}
              </div>

              <button
                type="button"
                onClick={handleComplete}
                className="w-full py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors shadow-xs cursor-pointer"
              >
                {isAr ? 'تأكيد وحفظ إعدادات 2FA' : 'Verify & Enable 2FA'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
