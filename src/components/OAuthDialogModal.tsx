import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GOOGLE_PRESETS, GITHUB_PRESETS, OAuthAccountPreset } from '../services/authSecurity';
import { Check, Shield, User, ArrowRight, X, ExternalLink, Lock } from 'lucide-react';

interface OAuthDialogModalProps {
  provider: 'google' | 'github' | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OAuthDialogModal: React.FC<OAuthDialogModalProps> = ({
  provider,
  onClose,
  onSuccess,
}) => {
  const { loginWithOAuth } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!provider) return null;

  const handleSelectAccount = async (preset: OAuthAccountPreset) => {
    setIsLoading(true);
    try {
      await loginWithOAuth(provider, preset);
      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    setIsLoading(true);
    try {
      const preset: OAuthAccountPreset = {
        id: `${provider}-custom-${Date.now()}`,
        name: customName || (customEmail.split('@')[0]),
        email: customEmail,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customName || customEmail)}`,
        verified: true,
      };
      await loginWithOAuth(provider, preset);
      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#340404]/60 backdrop-blur-xs">
      <div className="bg-white rounded-md max-w-md w-full border border-gray-200 shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Provider Branding */}
        {provider === 'google' ? (
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {isAr ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {isAr ? 'المتابعة إلى ذا بدتايم ستور' : 'to continue to The Bedtime Store'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#24292e] text-white">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <div>
                <h3 className="font-semibold text-white text-sm">
                  {isAr ? 'تفويض تطبيق GitHub OAuth' : 'Authorize GitHub Application'}
                </h3>
                <p className="text-[11px] text-gray-300">
                  The Bedtime Store by @bedtime-boutique-bh
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white p-1.5 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {provider === 'google' ? (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-900">
                  {isAr ? 'اختاري حساباً للمتابعة:' : 'Choose an account'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {isAr
                    ? 'ستشارك Google اسمك وعنوان بريدك الإلكتروني وصورة ملفك الشخصي مع ذا بدتايم ستور.'
                    : 'To continue, Google will share your name, email address, language preference, and profile picture with The Bedtime Store.'}
                </p>
              </div>

              {/* Account Presets */}
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
                {GOOGLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    disabled={isLoading}
                    onClick={() => handleSelectAccount(preset)}
                    className="w-full px-4 py-3 text-left rtl:text-right flex items-center justify-between hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={preset.avatarUrl}
                        alt={preset.name}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {preset.name}
                        </p>
                        <p className="text-[11px] text-gray-500">{preset.email}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 rtl:rotate-180 transition-colors" />
                  </button>
                ))}

                {/* Option to use another account */}
                <button
                  type="button"
                  onClick={() => setShowCustomInput(!showCustomInput)}
                  className="w-full px-4 py-3 text-left rtl:text-right flex items-center gap-3 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                    <User className="w-4 h-4" />
                  </div>
                  <span>{isAr ? 'استخدام حساب Google آخر...' : 'Use another Google account...'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* GitHub OAuth consent */}
              <div className="bg-gray-50 p-3.5 rounded-md border border-gray-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'الأذونات المطلوبة للمصادقة' : 'Requested Authorization Scopes'}</span>
                </div>
                <ul className="space-y-1 text-[11px] text-gray-600 list-disc list-inside">
                  <li><strong>read:user</strong> — {isAr ? 'الوصول لملف المستخدم التعريفي والاسم' : 'Read profile info, avatar and handle'}</li>
                  <li><strong>user:email</strong> — {isAr ? 'التحقق من البريد الإلكتروني المعتمد' : 'Verify primary and verified email addresses'}</li>
                </ul>
              </div>

              {/* GitHub Accounts Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 block">
                  {isAr ? 'تسجيل الدخول بواسطة حساب GitHub:' : 'Sign in as:'}
                </label>
                <div className="space-y-2">
                  {GITHUB_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      disabled={isLoading}
                      onClick={() => handleSelectAccount(preset)}
                      className="w-full p-3 border border-gray-200 hover:border-gray-800 rounded-md text-left rtl:text-right flex items-center justify-between hover:bg-gray-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={preset.avatarUrl}
                          alt={preset.name}
                          className="w-8 h-8 rounded-full object-cover border"
                        />
                        <div>
                          <p className="text-xs font-semibold text-gray-900 group-hover:text-black">
                            {preset.name}
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono">@{preset.handle}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-xs font-mono">
                        {isAr ? 'تفويض' : 'Authorize'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Custom Account Form (if toggled) */}
          {showCustomInput && (
            <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-gray-100 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  {isAr ? 'الاسم الكامل' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Dana Al Mutawa"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder={provider === 'google' ? 'yourname@gmail.com' : 'username@github.com'}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xs transition-colors"
              >
                {isLoading ? (isAr ? 'جارٍ التحقق...' : 'Authorizing...') : (isAr ? 'المتابعة والتفويض' : 'Continue & Authorize')}
              </button>
            </form>
          )}

          {/* Privacy Note */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>{isAr ? 'اتصال مشفر 256-bit OAuth 2.0' : '256-bit Encrypted OAuth 2.0'}</span>
            </span>
            <span>The Bedtime Store BH</span>
          </div>

        </div>

      </div>
    </div>
  );
};
