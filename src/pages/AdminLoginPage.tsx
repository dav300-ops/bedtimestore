import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import boutiqueLogo from '../assets/images/boutique_logo.jpeg';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onReturnToStore: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onReturnToStore,
}) => {
  const { loginAdmin } = useAuth();
  const { language, setLanguage, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const isRu = language === 'ru';
  const isFr = language === 'fr';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#2B060D] via-[#4A0A15] to-[#1D0409] text-[#FBF4E4] px-4 py-8">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onReturnToStore}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] font-semibold text-[#E3C878] hover:text-white transition-colors cursor-pointer"
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
        <div className="flex items-center border border-[#C9A24B]/60 rounded-full p-0.5 bg-black/25">
          {(['en', 'ar', 'ru', 'fr'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer uppercase ${
                language === lang
                  ? 'bg-[#C9A24B] text-[#4A0A15]'
                  : 'text-[#FBF4E4]/80 hover:text-[#E3C878]'
              }`}
            >
              {lang === 'ar' ? 'العربية' : lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Centered Admin Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-[#FFFDF9] text-[#3B2A24] rounded-md border border-[#C9A24B]/60 shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#6B0F1F] text-[#FBF4E4] px-6 py-7 text-center border-b border-[#C9A24B]/50 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full border-2 border-[#C9A24B] bg-[#4A0A15] flex items-center justify-center overflow-hidden shadow-md">
              <img src={boutiqueLogo} alt="Deluxe Bedtime Store" className="w-full h-full object-cover" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4A0A15] border border-[#C9A24B]/50 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E3C878]">
              <ShieldCheck className="w-3.5 h-3.5" />
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

            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-white tracking-wide">
              {isAr
                ? 'تسجيل دخول المشرفين'
                : isRu
                ? 'Вход для администраторов'
                : isFr
                ? 'Connexion Administrateur'
                : 'Administrator Sign In'}
            </h1>

            <p className="text-xs text-[#FBF4E4]/80 max-w-xs mx-auto leading-relaxed">
              {isAr
                ? 'مخصص لمسؤولي متجر ديلوكس بدتايم ستور في مملكة البحرين فقط.'
                : isRu
                ? 'Только для уполномоченных сотрудников Deluxe Bedtime Store.'
                : isFr
                ? 'Accès réservé aux administrateurs autorisés de Deluxe Bedtime Store.'
                : 'Authorized Deluxe Bedtime Store management personnel only.'}
            </p>
          </div>

          {/* Login Form */}
          <div className="p-6 sm:p-8 space-y-5">
            {lockoutSeconds > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xs flex items-start gap-2.5 text-xs text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xs flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#3B2A24] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#8A5A1E]" />
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
                  placeholder="admin@thebedtimestore.bh"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#C9A24B]/50 rounded-xs text-[#3B2A24] focus:outline-none focus:ring-1 focus:ring-[#6B0F1F] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#3B2A24] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8A5A1E]" />
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
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#C9A24B]/50 rounded-xs text-[#3B2A24] focus:outline-none focus:ring-1 focus:ring-[#6B0F1F] text-xs pr-10 rtl:pr-3.5 rtl:pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-[#6B0F1F] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || lockoutSeconds > 0}
                className="w-full py-3 bg-[#6B0F1F] hover:bg-[#4A0A15] disabled:opacity-50 text-[#FBF4E4] border border-[#C9A24B] font-semibold uppercase tracking-[0.18em] rounded-xs transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-[#E3C878]" />
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
            </form>

           
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-[11px] text-[#E3C878]/70 tracking-wider uppercase">
        Deluxe Bedtime Store · Kingdom of Bahrain
      </div>
    </div>
  );
};
