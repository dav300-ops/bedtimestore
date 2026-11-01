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
        // Automatically redirect admin to the admin dashboard after authentication
        if (res.user?.role === 'admin') {
          onNavigate?.('admin');
        }
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
    <div className="bg-white rounded-md border border-[#E1D1E4] shadow-xl overflow-hidden text-[#340404]">
      {/* Top Header Banner */}
      <div className="bg-[#340404] text-white p-6 sm:p-7 relative text-center">
        {!embedded && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-[#8E7C49] font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#8E7C49]" />
          <span>{isAr ? 'ذا بدتايم ستور · البحرين' : 'The Bedtime Store '}</span>
        </div>

        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#FBE7E3]">
          {mode === 'signin' && (isAr ? 'تسجيل الدخول إلى حسابك' : 'Welcome to Luxury Bedtime')}
          {mode === 'signup' && (isAr ? 'إنشاء حساب عضوية جديد' : 'Join Our Luxury Boutique')}
          {mode === 'forgot' && (isAr ? 'استعادة كلمة المرور' : 'Reset Your Password')}
        </h2>

        <p className="text-xs text-[#FBE7E3]/80 mt-1 max-w-sm mx-auto">
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
              className={`px-5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all ${
                mode === 'signin'
                  ? 'bg-[#E22001] text-white shadow-xs'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
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
              className={`px-5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all ${
                mode === 'signup'
                  ? 'bg-[#E22001] text-white shadow-xs'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
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
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xs flex items-start gap-2.5 text-xs text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
          <div className="p-3.5 bg-red-50 border border-[#E22001]/30 rounded-xs flex items-start gap-2.5 text-xs text-[#E22001]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{authError}</div>
          </div>
        )}

        {authSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xs flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div>{authSuccess}</div>
          </div>
        )}

        {/* Simulated Code Preview (Developer/Tester Convenience) */}
        {simulatedCodePreview && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xs text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>
                {isAr ? 'رمز التحقق التجريبي:' : 'Demo Security Code:'}{' '}
                <strong className="font-mono text-sm tracking-widest">{simulatedCodePreview}</strong>
              </span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-xs">
              Valid 15m
            </span>
          </div>
        )}

        {/* OAuth Buttons (Only on signin and signup) */}
        {mode !== 'forgot' && (
          <div className="space-y-3">
           
          

            {/* Guest Login Option Card */}
            <div className="bg-[#FBE7E3]/60 border border-[#8E7C49]/40 rounded-xs p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#340404] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#8E7C49]" />
                  <span>{isAr ? 'الدخول كزائر (Guest Login)' : 'New Customer? Guest Login'}</span>
                </span>
                <span className="text-[10px] bg-white text-[#8E7C49] font-bold px-1.5 py-0.5 rounded-xs border border-[#8E7C49]/30">
                  {isAr ? 'بدون كلمة مرور' : 'No Password Required'}
                </span>
              </div>
              <p className="text-[11px] text-[#340404]/75 leading-relaxed">
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
                className="w-full py-2.5 px-3 bg-[#340404] hover:bg-black text-[#FBE7E3] text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#8E7C49]" />
                <span>{isAr ? 'المتابعة كزائر وإضافة المنتجات للسلة' : 'Continue as Guest & Start Shopping'}</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-[#E1D1E4] w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-gray-400 font-semibold absolute">
                {isAr ? 'أو بالبريد الإلكتروني' : 'Or with Email'}
              </span>
            </div>
          </div>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-[#340404] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#8E7C49]" />
                <span>{t.account.email}</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fatima@thebedtimestore.bh"
                className="w-full px-3 py-2.5 bg-white border border-[#E1D1E4] rounded-xs text-[#340404] focus:ring-1 focus:ring-[#E22001] outline-none text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-[#340404] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8E7C49]" />
                  <span>{t.account.password}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setAuthError('');
                  }}
                  className="text-[11px] text-[#8E7C49] hover:text-[#E22001] transition-colors"
                >
                  {isAr ? 'نسيتِ كلمة المرور؟' : 'Forgot Password?'}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-white border border-[#E1D1E4] rounded-xs text-[#340404] focus:ring-1 focus:ring-[#E22001] outline-none text-xs pr-10 rtl:pr-3 rtl:pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-xs text-[#E22001] focus:ring-[#E22001]"
                />
                <span>{isAr ? 'تذكرني على هذا الجهاز' : 'Remember me on this browser'}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || lockoutSeconds > 0}
              className="w-full py-3 bg-[#E22001] hover:bg-[#c01b01] disabled:opacity-50 text-white font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-xs"
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
                <label className="font-semibold text-[#340404]">
                  {isAr ? 'الاسم الأول *' : 'First Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Fatima"
                  className="w-full px-3 py-2 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#340404]">
                  {isAr ? 'اسم العائلة *' : 'Last Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Al Khalifa"
                  className="w-full px-3 py-2 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#340404]">
                  {t.account.email} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fatima@example.com"
                  className="w-full px-3 py-2 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#340404]">
                  {t.checkout.phone} *
                </label>
                <div className="flex">
                  <span className="px-2.5 py-2 bg-gray-100 border border-r-0 rtl:border-r rtl:border-l-0 border-[#E1D1E4] text-gray-600 font-mono text-xs rounded-l-xs rtl:rounded-l-none rtl:rounded-r-xs">
                    +973
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="3900 1234"
                    className="w-full px-3 py-2 bg-white border border-[#E1D1E4] rounded-r-xs rtl:rounded-r-none rtl:rounded-l-xs outline-none focus:ring-1 focus:ring-[#E22001]"
                  />
                </div>
              </div>
            </div>

            {/* Password with Strength Meter */}
            <div className="space-y-1">
              <label className="font-semibold text-[#340404] flex items-center justify-between">
                <span>{t.account.password} *</span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {isAr ? '8 خانات على الأقل مع رموز وأرقام' : 'Min 8 chars, symbols & digits'}
                </span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001] pr-10 rtl:pr-3 rtl:pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Real-time Password Security Meter */}
              <PasswordStrengthMeter password={password} showChecklist={true} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="font-semibold text-[#340404]">
                {isAr ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 bg-white border rounded-xs outline-none pr-10 rtl:pr-3 rtl:pl-10 ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                      : confirmPassword && password === confirmPassword
                      ? 'border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'border-[#E1D1E4] focus:ring-1 focus:ring-[#E22001]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-red-600 font-medium">
                  {isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'كلمتا المرور متطابقتان' : 'Passwords match'}</span>
                </p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 cursor-pointer text-[11px] text-gray-600">
              <input
                type="checkbox"
                required
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded-xs text-[#E22001] focus:ring-[#E22001]"
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
              className="w-full py-3 bg-[#E22001] hover:bg-[#c01b01] text-white font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-xs"
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
                  <label className="font-semibold text-[#340404]">
                    {isAr ? 'البريد الإلكتروني المسجل *' : 'Registered Email Address *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="fatima@thebedtimestore.bh"
                    className="w-full px-3 py-2.5 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#E22001] hover:bg-[#c01b01] text-white font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-xs"
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
                    className="text-xs text-[#8E7C49] hover:underline"
                  >
                    {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFinalizeReset} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#340404]">
                    {isAr ? 'رمز الأمان المكون من 6 أرقام *' : '6-Digit Verification Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001] font-mono tracking-widest text-center text-base"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#340404]">
                    {isAr ? 'كلمة المرور الجديدة *' : 'New Strong Password *'}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001]"
                  />
                  <PasswordStrengthMeter password={password} showChecklist={true} />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#340404]">
                    {isAr ? 'تأكيد كلمة المرور الجديدة *' : 'Confirm New Password *'}
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-white border border-[#E1D1E4] rounded-xs outline-none focus:ring-1 focus:ring-[#E22001]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#E22001] hover:bg-[#c01b01] text-white font-semibold uppercase tracking-wider rounded-xs transition-colors shadow-xs"
                >
                  {isSubmitting ? (isAr ? 'جارٍ التحديث...' : 'Updating Password...') : (isAr ? 'تحديث كلمة المرور والدخول' : 'Update Password & Sign In')}
                </button>

                <div className="flex justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-gray-500 hover:underline"
                  >
                    {isAr ? 'طلب رمز جديد' : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-[#8E7C49] hover:underline"
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
          onSuccess={(oauthUser) => {
            if (onClose) onClose();
            if (oauthUser?.role === 'admin') {
              onNavigate?.('admin');
            }
          }}
        />
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#340404]/60 backdrop-blur-xs">
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        {content}
      </div>
    </div>
  );
};
