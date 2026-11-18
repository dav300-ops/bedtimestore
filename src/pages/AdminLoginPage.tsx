import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  MailCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import boutiqueLogo from '../assets/images/boutique_logo.jpeg';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onReturnToStore: () => void;
}

type LoginMode = 'password' | 'otp-email' | 'otp-code';

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onReturnToStore,
}) => {
  const { loginAdmin, completeOtpLogin } = useAuth();
  const { language, setLanguage, isRtl, t } = useLanguage();
  const isAr = language === 'ar';
  const isRu = language === 'ru';
  const isFr = language === 'fr';
  const otpStrings = t.adminOtp;

  // Password login state (existing flow preserved)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // OTP feature & step state
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [otpFeatureEnabled, setOtpFeatureEnabled] = useState(true);
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [sentNotice, setSentNotice] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [expirySeconds, setExpirySeconds] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const autoSubmittedCodeRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    api
      .getAdminOtpConfig()
      .then((cfg) => {
        if (mounted && typeof cfg?.enabled === 'boolean') {
          setOtpFeatureEnabled(cfg.enabled);
          if (!cfg.enabled) {
            setLoginMode('password');
          }
        }
      })
      .catch(() => {
        // default to true on transient check; backend enforces OTP_LOGIN_ENABLED definitively
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (loginMode === 'otp-code') {
      const focusTimer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 60);
      return () => clearTimeout(focusTimer);
    }
  }, [loginMode]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const resetOtpFlowTo = (targetMode: LoginMode) => {
    setErrorMsg('');
    setChallengeId('');
    setMaskedEmail('');
    setSentNotice('');
    setOtpDigits(['', '', '', '', '', '']);
    setExpirySeconds(0);
    setResendCooldown(0);
    autoSubmittedCodeRef.current = '';
    setLoginMode(targetMode);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await loginAdmin(email, password);
      if (!res.success) {
        setErrorMsg(
          res.error ||
            (isAr
              ? 'بيانات دخول المشرف غير صحيحة.'
              : isRu
              ? 'Неверный адрес электронной почты или пароль администратора.'
              : isFr
              ? 'Identifiants administrateur invalides.'
              : 'Invalid administrator credentials.')
        );
        if (res.remainingSeconds) {
          setLockoutSeconds(res.remainingSeconds);
        }
      } else {
        onLoginSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsRequestingOtp(true);
    autoSubmittedCodeRef.current = '';

    try {
      const res = await api.requestAdminOtp(email.trim(), language);
      setChallengeId(res.challengeId);
      setMaskedEmail(res.maskedEmail);
      setSentNotice(otpStrings.genericSentNotice || res.message);
      setExpirySeconds(res.expiresInSeconds || 600);
      setResendCooldown(res.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setLoginMode('otp-code');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process verification code request.');
      if (err?.retryAfterSeconds) {
        if (err?.code === 'OTP_COOLDOWN') {
          setResendCooldown(err.retryAfterSeconds);
        } else {
          setLockoutSeconds(err.retryAfterSeconds);
        }
      }
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const submitOtpCode = async (code: string) => {
    if (isVerifyingOtp) return;
    if (!/^\d{6}$/.test(code)) {
      setErrorMsg(otpStrings.invalidCodePrompt);
      return;
    }
    setErrorMsg('');
    setIsVerifyingOtp(true);

    try {
      const res = await api.verifyAdminOtp(challengeId, code);
      if (res?.success && res.admin && res.token) {
        completeOtpLogin(res.admin, res.token);
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired verification code.');
      if (err?.retryAfterSeconds) {
        setLockoutSeconds(err.retryAfterSeconds);
      }
      if (err?.code === 'OTP_MAX_ATTEMPTS' || err?.code === 'OTP_EXPIRED' || err?.code === 'OTP_INACTIVE') {
        setOtpDigits(['', '', '', '', '', '']);
        autoSubmittedCodeRef.current = '';
        setTimeout(() => otpInputRefs.current[0]?.focus(), 40);
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const joined = otpDigits.join('');
    await submitOtpCode(joined);
  };

  const handleResendOtp = async () => {
    if (!challengeId || resendCooldown > 0 || isResendingOtp) return;
    setErrorMsg('');
    setIsResendingOtp(true);
    autoSubmittedCodeRef.current = '';

    try {
      const res = await api.resendAdminOtp(challengeId, language);
      setChallengeId(res.challengeId);
      setMaskedEmail(res.maskedEmail);
      setSentNotice(otpStrings.genericSentNotice || res.message);
      setExpirySeconds(res.expiresInSeconds || 600);
      setResendCooldown(res.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 60);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to resend verification code.');
      if (err?.retryAfterSeconds) {
        setResendCooldown(err.retryAfterSeconds);
      }
    } finally {
      setIsResendingOtp(false);
    }
  };

  const applyPastedOrTypedDigits = (startIndex: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) {
      const next = [...otpDigits];
      next[startIndex] = '';
      setOtpDigits(next);
      return;
    }

    const next = [...otpDigits];
    if (digitsOnly.length >= 6) {
      const six = digitsOnly.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        next[i] = six[i] || '';
      }
      setOtpDigits(next);
      otpInputRefs.current[5]?.focus();
      const fullCode = next.join('');
      if (fullCode.length === 6 && autoSubmittedCodeRef.current !== fullCode) {
        autoSubmittedCodeRef.current = fullCode;
        void submitOtpCode(fullCode);
      }
      return;
    }

    let cursor = startIndex;
    for (const ch of digitsOnly) {
      if (cursor >= 6) break;
      next[cursor] = ch;
      cursor++;
    }
    setOtpDigits(next);

    if (cursor < 6) {
      otpInputRefs.current[cursor]?.focus();
    } else {
      otpInputRefs.current[5]?.focus();
    }

    const fullCode = next.join('');
    if (fullCode.length === 6 && autoSubmittedCodeRef.current !== fullCode) {
      autoSubmittedCodeRef.current = fullCode;
      void submitOtpCode(fullCode);
    }
  };

  const handleOtpInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    applyPastedOrTypedDigits(index, e.target.value);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = '';
        setOtpDigits(next);
      } else if (index > 0) {
        const next = [...otpDigits];
        next[index - 1] = '';
        setOtpDigits(next);
        otpInputRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handleOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      e.preventDefault();
      applyPastedOrTypedDigits(index, pasted);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--surface-page)] text-[var(--text-body)] px-4 py-8">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onReturnToStore}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] font-semibold text-[var(--maroon-700)] hover:text-[var(--maroon-600)] transition-colors cursor-pointer"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>
            {isAr
              ? 'العودة إلى المتجر'
              : isRu
              ? 'Вернуться в бутик'
              : isFr
              ? 'Retour à la boutique'
              : 'Return to Storefront'}
          </span>
        </button>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] p-1 bg-[var(--surface-champagne)] border border-[var(--line)]">
          {(['en', 'ar', 'ru', 'fr'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-[var(--radius-pill)] transition-all cursor-pointer uppercase border ${
                language === lang
                  ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border-[var(--maroon-700)]'
                  : 'bg-[var(--surface-card)] text-[var(--maroon-700)] border-[var(--line)] hover:bg-[var(--surface-champagne)]'
              }`}
            >
              {lang === 'ar' ? 'العربية' : lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Centered Admin Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-[var(--surface-card)] text-[var(--text-body)] rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[var(--maroon-700)] text-[var(--text-on-maroon)] px-6 py-7 text-center border-b border-[var(--gold-decor)] space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full border-2 border-[var(--gold-decor)] bg-[var(--maroon-900)] flex items-center justify-center overflow-hidden shadow-md">
              <img src={boutiqueLogo} alt="Deluxe Bedtime Store" className="w-full h-full object-cover" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--maroon-900)] border border-[var(--gold-decor)] text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--surface-champagne)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--gold-decor)]" />
              <span>
                {isAr
                  ? 'بوابة الإدارة المقيدة'
                  : isRu
                  ? 'Портал администратора'
                  : isFr
                  ? 'Portail Administrateur'
                  : 'Admin Login Portal'}
              </span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--text-on-maroon)] tracking-wide">
              {loginMode === 'otp-email'
                ? otpStrings.stepATitle
                : loginMode === 'otp-code'
                ? otpStrings.stepBTitle
                : isAr
                ? 'تسجيل دخول المشرفين'
                : isRu
                ? 'Вход для администраторов'
                : isFr
                ? 'Connexion Administrateur'
                : 'Administrator Sign In'}
            </h1>

            <p className="text-xs text-[var(--surface-champagne)] max-w-xs mx-auto leading-relaxed">
              {loginMode === 'otp-email'
                ? otpStrings.stepASubtitle
                : loginMode === 'otp-code'
                ? otpStrings.genericSentNotice
                : isAr
                ? 'مخصص لمسؤولي متجر ديلوكس بدتايم ستور في مملكة البحرين فقط.'
                : isRu
                ? 'Только для уполномоченных сотрудников Deluxe Bedtime Store.'
                : isFr
                ? 'Accès réservé aux administrateurs autorisés de Deluxe Bedtime Store.'
                : 'Authorized Deluxe Bedtime Store management personnel only.'}
            </p>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-5">
            {lockoutSeconds > 0 && (
              <div
                role="alert"
                className="p-3.5 bg-[var(--surface-blush)] border border-[var(--red-600)] rounded-xs flex items-start gap-2.5 text-xs text-[var(--red-600)]"
              >
                <Clock className="w-4 h-4 text-[var(--red-600)] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {isAr ? 'تم تفعيل القفل الأمني المؤقت' : 'Admin Portal Security Lockout'}
                  </p>
                  <p>
                    {isAr
                      ? `يرجى الانتظار ${lockoutSeconds} ثانية قبل إعادة المحاولة.`
                      : `Please wait ${lockoutSeconds} seconds before trying again.`}
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3.5 bg-[var(--surface-blush)] border border-[var(--red-600)] rounded-xs flex items-start gap-2.5 text-xs text-[var(--red-600)] font-medium"
              >
                <AlertCircle className="w-4 h-4 text-[var(--red-600)] shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* MODE 1: Standard Email + Password Sign In */}
            {loginMode === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                    <span>
                      {isAr
                        ? 'البريد الإلكتروني الرسمي للمشرف'
                        : isRu
                        ? 'Служебный Email администратора'
                        : isFr
                        ? 'E-mail administrateur officiel'
                        : 'Official Administrator Email'}
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(errorMsg)}
                    placeholder="admin@domain.com"
                    className="token-input w-full px-3.5 py-2.5 border rounded-xs text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                    <span>
                      {isAr
                        ? 'كلمة المرور الإدارية'
                        : isRu
                        ? 'Пароль администратора'
                        : isFr
                        ? 'Mot de passe administrateur'
                        : 'Administrator Password'}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={Boolean(errorMsg)}
                      placeholder="••••••••••••"
                      className="token-input w-full px-3.5 py-2.5 border rounded-xs text-xs pr-10 rtl:pr-3.5 rtl:pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-[var(--text-muted)] hover:text-[var(--maroon-700)] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || lockoutSeconds > 0}
                  className="w-full py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] disabled:opacity-50 text-[var(--text-on-maroon)] border border-[var(--gold-decor)] font-semibold uppercase tracking-[0.18em] rounded-[var(--radius-pill)] transition-colors shadow-[var(--shadow-soft)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-[var(--gold-decor)]" />
                  <span>
                    {isSubmitting
                      ? isAr
                        ? 'جارٍ التحقق من الصلاحيات...'
                        : 'Verifying Admin Session...'
                      : isAr
                      ? 'دخول لوحة التحكم الإدارية'
                      : isRu
                      ? 'Войти в панель администратора'
                      : isFr
                      ? 'Accéder au tableau de bord'
                      : 'Sign In to Admin Dashboard'}
                  </span>
                </button>

                {otpFeatureEnabled && (
                  <div className="pt-2 text-center border-t border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => resetOtpFlowTo('otp-email')}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--maroon-700)] hover:text-[var(--maroon-600)] underline underline-offset-4 cursor-pointer py-1"
                    >
                      <MailCheck className="w-3.5 h-3.5 text-[var(--gold-text)] shrink-0" />
                      <span>{otpStrings.cantSignInLink}</span>
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* MODE 2: Email Code Login — Step A (Enter Admin Email) */}
            {loginMode === 'otp-email' && (
              <form onSubmit={handleRequestOtpSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                    <span>{otpStrings.emailLabel}</span>
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@thebedtimestore.bh"
                    className="token-input w-full px-3.5 py-2.5 border rounded-xs text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRequestingOtp || lockoutSeconds > 0}
                  className="w-full py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] disabled:opacity-50 text-[var(--text-on-maroon)] border border-[var(--gold-decor)] font-semibold uppercase tracking-[0.16em] rounded-[var(--radius-pill)] transition-colors shadow-[var(--shadow-soft)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <MailCheck className="w-4 h-4 text-[var(--gold-decor)]" />
                  <span>{isRequestingOtp ? otpStrings.sendingCode : otpStrings.sendCodeButton}</span>
                </button>

                <div className="pt-2 text-center border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => resetOtpFlowTo('password')}
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--maroon-700)] underline underline-offset-4 cursor-pointer py-1"
                  >
                    {otpStrings.backToPassword}
                  </button>
                </div>
              </form>
            )}

            {/* MODE 3: Email Code Login — Step B (Enter 6-Digit Code) */}
            {loginMode === 'otp-code' && (
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 text-xs">
                {/* Generic Anti-Enumeration Banner + Masked Email Hint */}
                <div className="p-3.5 bg-[var(--surface-champagne)] border border-[var(--gold-soft)] rounded-xs space-y-1">
                  <div className="flex items-start gap-2 text-[var(--text-strong)] font-medium">
                    <MailCheck className="w-4 h-4 text-[var(--gold-text)] shrink-0 mt-0.5" />
                    <span>{sentNotice || otpStrings.genericSentNotice}</span>
                  </div>
                  {maskedEmail && (
                    <p className="text-[11px] text-[var(--text-muted)] ps-6">
                      {otpStrings.sentToHint}{' '}
                      <span dir="ltr" className="font-mono font-bold text-[var(--maroon-700)]">
                        {maskedEmail}
                      </span>
                    </p>
                  )}
                </div>

                {/* 6 Individual Numeric Boxes (forced LTR even in Arabic RTL) */}
                <div className="space-y-2">
                  <div
                    dir="ltr"
                    className="grid grid-cols-6 gap-2 sm:gap-2.5 max-w-xs mx-auto"
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={index === 0 ? 6 : 1}
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        aria-label={otpStrings.digitAriaLabel.replace('{index}', String(index + 1))}
                        value={digit}
                        onChange={(e) => handleOtpInputChange(index, e)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={(e) => handleOtpPaste(index, e)}
                        disabled={isVerifyingOtp}
                        className="token-input h-12 sm:h-13 w-full text-center font-mono text-lg sm:text-xl font-bold border rounded-xs focus:ring-2 focus:ring-[var(--maroon-700)] focus:border-[var(--maroon-700)] bg-[var(--surface-card)] text-[var(--text-strong)]"
                      />
                    ))}
                  </div>

                  {/* Expiry Countdown */}
                  <div className="text-center text-[11px] flex items-center justify-center gap-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                    {expirySeconds > 0 ? (
                      <span className="text-[var(--text-muted)]">
                        {otpStrings.expiresInLabel}{' '}
                        <strong dir="ltr" className="font-mono text-[var(--maroon-700)]">
                          {formatCountdown(expirySeconds)}
                        </strong>
                      </span>
                    ) : (
                      <span className="text-[var(--red-600)] font-semibold">{otpStrings.expiredLabel}</span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || lockoutSeconds > 0 || otpDigits.join('').length < 6}
                  className="w-full py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] disabled:opacity-50 text-[var(--text-on-maroon)] border border-[var(--gold-decor)] font-semibold uppercase tracking-[0.16em] rounded-[var(--radius-pill)] transition-colors shadow-[var(--shadow-soft)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[var(--gold-decor)]" />
                  <span>{isVerifyingOtp ? otpStrings.verifyingButton : otpStrings.verifyButton}</span>
                </button>

                {/* Resend + Navigation Controls */}
                <div className="pt-3 border-t border-[var(--line)] space-y-2.5 text-center">
                  <div>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isResendingOtp}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--maroon-700)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed hover:underline underline-offset-4 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                      <span>
                        {isResendingOtp
                          ? otpStrings.resendingCode
                          : resendCooldown > 0
                          ? otpStrings.resendCooldown.replace('{seconds}', String(resendCooldown))
                          : otpStrings.resendCode}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => resetOtpFlowTo('otp-email')}
                      className="text-[var(--text-muted)] hover:text-[var(--maroon-700)] underline underline-offset-4 cursor-pointer"
                    >
                      {otpStrings.useDifferentEmail}
                    </button>
                    <span className="text-[var(--line)]">|</span>
                    <button
                      type="button"
                      onClick={() => resetOtpFlowTo('password')}
                      className="text-[var(--text-muted)] hover:text-[var(--maroon-700)] underline underline-offset-4 cursor-pointer"
                    >
                      {otpStrings.backToPassword}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-[11px] text-[var(--text-muted)] tracking-wider uppercase">
        Deluxe Bedtime Store · Kingdom of Bahrain
      </div>
    </div>
  );
};
