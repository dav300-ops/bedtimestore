import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { OAuthDialogModal } from './OAuthDialogModal';
import { analyzePassword } from '../services/authSecurity';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
  ShoppingBag,
} from 'lucide-react';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  defaultMode?: 'signin' | 'signup' | 'forgot';
  embedded?: boolean; // if true, renders directly without modal backdrop
  onNavigate?: (page: string, params?: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = true,
  onClose,
  defaultMode = 'signin',
  embedded = false,
  onNavigate,
}) => {
  const {
    login,
    register,
    loginAsGuest,
    requestPasswordReset,
    resetPasswordWithToken,
    currentUser,
  } = useAuth();
  const { language, t } = useLanguage();
  const isAr = language === 'ar';

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & error states
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Forgot password flow
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [simulatedCodePreview, setSimulatedCodePreview] = useState('');

  // OAuth Provider Dialog trigger
  const [activeOAuthProvider, setActiveOAuthProvider] = useState<'google' | null>(null);

  // Countdown timer for brute force lockout
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Sync defaultMode
  useEffect(() => {
    setMode(defaultMode);
    setAuthError('');
    setAuthSuccess('');
  }, [defaultMode]);

  // If registered user is already authenticated and this is opened as modal, auto-close
  useEffect(() => {
    if (currentUser && !currentUser.isGuest && !embedded && onClose) {
      onClose();
    }
  }, [currentUser, embedded, onClose]);

  if (!isOpen && !embedded) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setAuthError(res.error || 'Invalid credentials');
        if (res.remainingSeconds) {
          setLockoutSeconds(res.remainingSeconds);
        }
      } else {
        if (onClose) onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    // Verification checks
    if (!agreedTerms) {
      setAuthError(isAr ? 'يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية.' : 'Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    if (password !== confirmPassword) {
      setAuthError(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    const analysis = analyzePassword(password);
    if (analysis.score < 50) {
      setAuthError(
        isAr
          ? 'كلمة المرور لا تستوفي معايير الأمان الموصى بها (8 خانات، حروف كبيرة وصغيرة، أرقام ورموز).'
          : 'Password does not meet the minimum required security complexity.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        firstName,
        lastName,
        email,
        phone: `+973 ${phoneNumber}`,
        password,
      });

      if (!res.success) {
        setAuthError(res.error || 'Registration failed');
      } else {
        if (onClose) onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmitting(true);

    try {
      const res = await requestPasswordReset(email);
      if (!res.success) {
        setAuthError(res.error || 'Failed to request reset');
      } else {
        setSimulatedCodePreview(res.resetCode || '');
        setResetCode(res.resetCode || '');
        setForgotStep(2);
        setAuthSuccess(
          isAr
            ? `تم إرسال رمز الأمان المكون من 6 أرقام إلى ${email}.`
            : `A 6-digit security code has been sent to ${email}.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (password !== confirmPassword) {
      setAuthError(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithToken(email, resetCode, password);
      if (!res.success) {
        setAuthError(res.error || 'Reset failed');
      } else {
        setAuthSuccess(
          isAr
            ? 'تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.'
            : 'Password updated successfully! You can now sign in.'
        );
        setTimeout(() => {
          setMode('signin');
          setForgotStep(1);
          setSimulatedCodePreview('');
        }, 1500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="bg-[var(--surface-card)] rounded-[var(--radius-card)] border border-[var(--line)] shadow-[var(--shadow-soft)] overflow-hidden text-[var(--text-body)]">
      {/* Top Header Banner */}
      <div className="bg-[var(--maroon-900)] text-[var(--text-on-maroon)] p-6 sm:p-7 relative text-center">
        {!embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t.mobileMenu.closeMenu}
            className="absolute top-3 end-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--surface-champagne)] hover:text-[var(--text-on-maroon)] rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-[var(--gold-decor)] font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[var(--gold-decor)]" />
          <span>{isAr ? 'ذا بدتايم ستور · البحرين' : 'The Bedtime Store '}</span>
        </div>

        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--text-on-maroon)]">
          {mode === 'signin' && (isAr ? 'تسجيل الدخول إلى حسابك' : 'Welcome to Luxury Bedtime')}
          {mode === 'signup' && (isAr ? 'إنشاء حساب عضوية جديد' : 'Join Our Luxury Boutique')}
          {mode === 'forgot' && (isAr ? 'استعادة كلمة المرور' : 'Reset Your Password')}
        </h2>

        <p className="text-xs text-[var(--surface-champagne)]/90 mt-1 max-w-sm mx-auto">
          {mode === 'signin' && (isAr ? 'سجلي دخولك للوصول إلى طلباتك وقائمة أمنياتك وتوصيل سريع في البحرين.' : 'Sign in to access your orders, saved addresses, and wishlist.')}
          {mode === 'signup' && (isAr ? 'أنشئي حسابك الموثق واستمتعي بتجربة تسوق حصرية وآمنة.' : 'Create your secure account to unlock exclusive benefits and effortless checkout.')}
          {mode === 'forgot' && (isAr ? 'أدخلي بريدكِ الإلكتروني لاستلام رمز التحقق وإعادة تعيين كلمة المرور.' : 'Enter your registered email to receive a secure 6-digit recovery code.')}
        </p>

        {/* Mode Switcher Tabs */}
        {mode !== 'forgot' && (
          <div className="flex justify-center gap-2 mt-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError('');
              }}
              className={`px-5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border border-[var(--gold-decor)] shadow-xs'
                  : 'bg-white/10 text-[var(--surface-champagne)] hover:bg-white/20'
              }`}
            >
              {t.account.signIn}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setAuthError('');
              }}
              className={`px-5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[var(--maroon-700)] text-[var(--text-on-maroon)] border border-[var(--gold-decor)] shadow-xs'
                  : 'bg-white/10 text-[var(--surface-champagne)] hover:bg-white/20'
              }`}
            >
              {t.account.signUp}
            </button>
          </div>
        )}
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Alerts */}
        {lockoutSeconds > 0 && (
          <div role="alert" className="p-3.5 bg-[var(--surface-blush)] border border-[var(--red-600)] rounded-lg flex items-start gap-2.5 text-xs text-[var(--red-600)]">
            <Clock className="w-4 h-4 text-[var(--red-600)] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{isAr ? 'الحساب مقفل مؤقتاً لدواعي الأمان' : 'Account Security Lockout'}</p>
              <p>
                {isAr
                  ? `يرجى الانتظار ${lockoutSeconds} ثانية قبل إعادة المحاولة لمنع هجمات التخمين.`
                  : `Please wait ${lockoutSeconds} seconds before trying again to protect against brute-force attempts.`}
              </p>
            </div>
          </div>
        )}

        {authError && (
          <div role="alert" className="p-3.5 bg-[var(--surface-blush)] border border-[var(--red-600)] rounded-lg flex items-start gap-2.5 text-xs text-[var(--red-600)] font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{authError}</div>
          </div>
        )}

        {authSuccess && (
          <div role="status" className="p-3.5 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg flex items-start gap-2.5 text-xs text-[var(--status-success)]">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[var(--status-success)]" />
            <div>{authSuccess}</div>
          </div>
        )}

        {/* Simulated Code Preview (Developer/Tester Convenience) */}
        {simulatedCodePreview && (
          <div className="p-3 bg-[var(--surface-champagne)] border border-[var(--gold-decor)] rounded-lg text-xs text-[var(--maroon-700)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[var(--gold-text)]" />
              <span>
                {isAr ? 'رمز التحقق التجريبي:' : 'Demo Security Code:'}{' '}
                <strong className="font-mono text-sm tracking-widest">{simulatedCodePreview}</strong>
              </span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-[var(--maroon-700)] bg-[var(--surface-card)] border border-[var(--gold-decor)] px-2 py-0.5 rounded-xs">
              Valid 15m
            </span>
          </div>
        )}

        {/* Guest Option */}
        {mode !== 'forgot' && (
          <div className="space-y-3">
            <div className="bg-[var(--surface-champagne)]/70 border border-[var(--gold-decor)]/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-strong)] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                  <span>{isAr ? 'الدخول كزائر (Guest Login)' : 'New Customer? Guest Login'}</span>
                </span>
                <span className="text-[10px] bg-[var(--surface-card)] text-[var(--gold-text)] gold-text-rtl-weight font-bold px-1.5 py-0.5 rounded-xs border border-[var(--gold-decor)]/60">
                  {isAr ? 'بدون كلمة مرور' : 'No Password Required'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-body)] leading-relaxed">
                {isAr
                  ? 'يمكنك تصفح تشكيلة ملابس النوم وإضافة المنتجات إلى السلة بحرية. سيُطلب منك إنشاء حساب فقط قبل تأكيد الطلب والدفع.'
                  : 'Browse luxury sleepwear and add items to your cart freely. You only need to create an account before final checkout.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  loginAsGuest();
                  if (onClose) onClose();
                }}
                className="w-full py-2.5 px-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] text-xs font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[var(--surface-champagne)]" />
                <span>{isAr ? 'المتابعة كزائر وإضافة المنتجات للسلة' : 'Continue as Guest & Start Shopping'}</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-[var(--line)] w-full" />
              <span className="bg-[var(--surface-card)] px-3 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold absolute">
                {isAr ? 'أو بالبريد الإلكتروني' : 'Or with Email'}
              </span>
            </div>
          </div>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                <span>{t.account.email}</span>
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fatima@thebedtimestore.bh"
                className="token-input w-full min-h-[44px] px-3 py-2.5 border rounded-md text-base sm:text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--gold-text)]" />
                  <span>{t.account.password}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setAuthError('');
                  }}
                  className="text-[11px] text-[var(--gold-text)] gold-text-rtl-weight hover:text-[var(--maroon-700)] transition-colors py-1 cursor-pointer"
                >
                  {isAr ? 'نسيتِ كلمة المرور؟' : 'Forgot Password?'}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="token-input w-full min-h-[44px] px-3 py-2.5 border rounded-md text-base sm:text-xs pe-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 end-0 min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-strong)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-body)] min-h-[44px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-xs accent-[var(--maroon-700)]"
                />
                <span>{isAr ? 'تذكرني على هذا الجهاز' : 'Remember me on this browser'}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || lockoutSeconds > 0}
              className="w-full min-h-[48px] py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] disabled:opacity-50 text-[var(--text-on-maroon)] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors shadow-xs cursor-pointer"
            >
              {isSubmitting ? (isAr ? 'جارٍ التحقق...' : 'Verifying Credentials...') : t.account.signIn}
            </button>
          </form>
        )}

        {/* MODE: SIGN UP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-strong)]">
                  {isAr ? 'الاسم الأول *' : 'First Name *'}
                </label>
                <input
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Fatima"
                  className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-strong)]">
                  {isAr ? 'اسم العائلة *' : 'Last Name *'}
                </label>
                <input
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Al Khalifa"
                  className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-strong)]">
                  {t.account.email} *
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fatima@example.com"
                  className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md text-base sm:text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-strong)]">
                  {t.checkout.phone} *
                </label>
                <div className="flex">
                  <span className="px-2.5 min-h-[44px] flex items-center bg-[var(--surface-page)] border border-e-0 border-[var(--line)] text-[var(--text-body)] font-mono text-xs rounded-s-md">
                    +973
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="3900 1234"
                    className="token-input w-full min-h-[44px] px-3 py-2 border rounded-e-md text-base sm:text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Password with Strength Meter */}
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text-strong)] flex items-center justify-between">
                <span>{t.account.password} *</span>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">
                  {isAr ? '8 خانات على الأقل مع رموز وأرقام' : 'Min 8 chars, symbols & digits'}
                </span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="token-input w-full min-h-[44px] px-3 py-2 border rounded-md pe-11 text-base sm:text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 end-0 min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-strong)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Real-time Password Security Meter */}
              <PasswordStrengthMeter password={password} showChecklist={true} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text-strong)]">
                {isAr ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={Boolean(confirmPassword && password !== confirmPassword)}
                  placeholder="••••••••"
                  className={`token-input w-full min-h-[44px] px-3 py-2 border rounded-md pe-11 text-base sm:text-xs ${
                    confirmPassword && password === confirmPassword
                      ? 'border-[var(--status-success)]'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
                  className="absolute inset-y-0 end-0 min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-strong)] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p role="alert" className="text-xs text-[var(--red-600)] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}</span>
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-[var(--status-success)] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'كلمتا المرور متطابقتان' : 'Passwords match'}</span>
                </p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[var(--text-body)] py-1">
              <input
                type="checkbox"
                required
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded-xs accent-[var(--maroon-700)]"
              />
              <span>
                {isAr
                  ? 'أوافق على الشروط والأحكام وسياسة الخصوصية الخاصة بمتجر ذا بدتايم ستور في مملكة البحرين.'
                  : 'I agree to THE BEDTIME STORE Boutique Terms & Conditions and Privacy Policy.'}
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors shadow-xs cursor-pointer"
            >
              {isSubmitting ? (isAr ? 'جارٍ إنشاء الحساب المشفر...' : 'Securing Account...') : t.account.signUp}
            </button>
          </form>
        )}

        {/* MODE: FORGOT / RESET PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4 text-xs">
            {forgotStep === 1 ? (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-strong)]">
                    {isAr ? 'البريد الإلكتروني المسجل *' : 'Registered Email Address *'}
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="fatima@thebedtimestore.bh"
                    className="token-input w-full min-h-[44px] px-3 py-2.5 border rounded-md text-base sm:text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (isAr ? 'جارٍ الإرسال...' : 'Sending Security Code...') : (isAr ? 'إرسال رمز التحقق (6 أرقام)' : 'Send 6-Digit Verification Code')}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setAuthError('');
                    }}
                    className="text-xs text-[var(--gold-text)] gold-text-rtl-weight hover:underline py-2 cursor-pointer"
                  >
                    {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFinalizeReset} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-strong)]">
                    {isAr ? 'رمز الأمان المكون من 6 أرقام *' : '6-Digit Verification Code *'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="token-input w-full min-h-[44px] px-3 py-2.5 border rounded-md font-mono tracking-widest text-center text-base"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-strong)]">
                    {isAr ? 'كلمة المرور الجديدة *' : 'New Strong Password *'}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="token-input w-full min-h-[44px] px-3 py-2.5 border rounded-md text-base sm:text-xs"
                  />
                  <PasswordStrengthMeter password={password} showChecklist={true} />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-strong)]">
                    {isAr ? 'تأكيد كلمة المرور الجديدة *' : 'Confirm New Password *'}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="token-input w-full min-h-[44px] px-3 py-2.5 border rounded-md text-base sm:text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] py-3 bg-[var(--maroon-700)] hover:bg-[var(--maroon-600)] text-[var(--text-on-maroon)] font-semibold uppercase tracking-wider rounded-[var(--radius-pill)] transition-colors shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (isAr ? 'جارٍ التحديث...' : 'Updating Password...') : (isAr ? 'تحديث كلمة المرور والدخول' : 'Update Password & Sign In')}
                </button>

                <div className="flex justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-[var(--text-muted)] hover:underline cursor-pointer"
                  >
                    {isAr ? 'طلب رمز جديد' : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-[var(--gold-text)] gold-text-rtl-weight hover:underline cursor-pointer"
                  >
                    {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* OAuth Dialog Popup */}
      {activeOAuthProvider && (
        <OAuthDialogModal
          provider={activeOAuthProvider}
          onClose={() => setActiveOAuthProvider(null)}
          onSuccess={() => {
            if (onClose) onClose();
          }}
        />
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--scrim-dark)] backdrop-blur-xs">
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        {content}
      </div>
    </div>
  );
};
