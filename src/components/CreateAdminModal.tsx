import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { analyzePassword } from '../services/authSecurity';
import {
  X,
  ShieldCheck,
  UserPlus,
  Mail,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminCreated?: (newAdmin: any) => void;
}

export const CreateAdminModal: React.FC<CreateAdminModalProps> = ({
  isOpen,
  onClose,
  onAdminCreated,
}) => {
  const { currentUser, createAdminUser } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const isRu = language === 'ru';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdAdminData, setCreatedAdminData] = useState<any | null>(null);

  // STRICT ACCESS CHECK: The Create Admin Modal should ONLY be accessible by an active administrator inside the admin dashboard
  if (!isOpen) return null;
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-text)]/60 backdrop-blur-xs">
        <div className="bg-[var(--color-card)] rounded-lg p-6 max-w-md w-full text-center space-y-4 border border-red-200">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
          <h3 className="font-heading text-lg font-bold text-red-700">
            {isAr ? 'وصول غير مصرح' : 'Access Restricted'}
          </h3>
          <p className="text-xs text-gray-600">
            {isAr
              ? 'إنشاء حسابات المشرفين متاح فقط للمشرفين المعتمدين من داخل لوحة التحكم الإدارية.'
              : 'Creating administrator accounts is restricted exclusively to authenticated store administrators inside the Admin Dashboard.'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-text)] text-white text-xs font-semibold rounded-xs uppercase tracking-wider"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  const handleReset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setCreatedAdminData(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.toLowerCase().trim();
    if (!firstName.trim() || !lastName.trim() || !cleanEmail || !password) {
      setErrorMsg(
        isAr
          ? 'يرجى ملء جميع الحقول الإلزامية للمشرف الجديد.'
          : 'Please complete all required fields for the new administrator.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(
        isAr ? 'كلمتا المرور غير متطابقتين.' : 'The passwords do not match.'
      );
      return;
    }

    const analysis = analyzePassword(password);
    if (!analysis.checks.minLength || !analysis.checks.hasUpper || !analysis.checks.hasLower || !analysis.checks.hasNumber) {
      setErrorMsg(
        isAr
          ? 'كلمة المرور الإدارية يجب أن تتكون من 8 أحرف على الأقل وتشمل حروفاً كبيرة وصغيرة وأرقاماً.'
          : 'Admin passwords must be at least 8 characters and include uppercase, lowercase, and numbers.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdminUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        phone: phone.trim() ? (phone.startsWith('+') ? phone : `+973 ${phone}`) : '+973 1722 8844',
        password,
      });

      if (!res.success) {
        setErrorMsg(res.error || (isAr ? 'فشل إنشاء حساب المشرف.' : 'Failed to create administrator account.'));
      } else {
        setSuccessMsg(
          isAr
            ? `تم إنشاء حساب المشرف الجديد "${res.admin?.firstName} ${res.admin?.lastName}" وحفظه في قاعدة بيانات MySQL بنجاح!`
            : `New administrator "${res.admin?.firstName} ${res.admin?.lastName}" successfully registered in MySQL database!`
        );
        setCreatedAdminData(res.admin);
        if (onAdminCreated) {
          onAdminCreated(res.admin);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while registering administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[var(--color-text)]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[var(--color-card)] rounded-md max-w-xl w-full border border-[var(--color-accent)]/30 shadow-2xl overflow-hidden relative">
        
        {/* Header - Brand Burgundy & Gold Accent */}
        <div className="bg-[var(--color-text)] text-[var(--color-bg)] px-6 py-5 relative border-b border-[var(--color-accent)]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserPlus className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
                  {isAr ? 'إدارة المشرفين والصلاحيات' : isRu ? 'Управление доступом' : 'Staff Access Management'}
                </span>
                <span className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/40 text-[9px] px-1.5 py-0.2 rounded-xs font-mono uppercase">
                  Admin Dashboard Only
                </span>
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-white tracking-wide">
                {isAr ? 'إضافة وتعيين مشرف جديد للمتجر' : isRu ? 'Создать нового администратора' : 'Create New Boutique Administrator'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs text-[var(--color-text)]">
          
          {/* Creator Attribution Badge */}
          <div className="p-3 bg-[var(--color-bg)]/60 border border-[var(--color-accent)]/30 rounded-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-[11px] text-[var(--color-text)]">
                {isAr ? 'المشرف المعتمد الذي يقوم بالإنشاء:' : isRu ? 'Авторизованный администратор:' : 'Authorized creating administrator:'}{' '}
                <strong className="text-[var(--color-text)]">{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.email})
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-accent)] font-semibold bg-white px-2 py-0.5 rounded-xs border border-[var(--color-accent)]/20">
              MySQL Authenticated
            </span>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xs space-y-3">
              <div className="flex items-start gap-2.5 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">{isAr ? 'تم الإنشاء بنجاح!' : 'Administrator Created Successfully!'}</p>
                  <p className="text-[11px] leading-relaxed mt-0.5">{successMsg}</p>
                </div>
              </div>

              {createdAdminData && (
                <div className="bg-white/90 p-3 rounded-xs border border-emerald-200 text-[11px] space-y-1 font-mono text-gray-700">
                  <p><strong>Admin ID:</strong> {createdAdminData.id}</p>
                  <p><strong>Official Email:</strong> {createdAdminData.email}</p>
                  <p><strong>Role:</strong> {createdAdminData.role} (Full Boutique Staff Permissions)</p>
                  <p><strong>Database:</strong> MySQL Relational Table `users`</p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-semibold rounded-xs"
                >
                  {isAr ? '+ إضافة مشرف آخر' : '+ Add Another Admin'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 bg-[var(--color-text)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-xs uppercase tracking-wider"
                >
                  {isAr ? 'تم وإغلاق' : 'Done & Close'}
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-xs flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>{isAr ? 'الاسم الأول *' : isRu ? 'Имя *' : 'First Name *'}</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Mariam"
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>{isAr ? 'اسم العائلة *' : isRu ? 'Фамилия *' : 'Last Name *'}</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Al Awadhi"
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>{isAr ? 'البريد الإلكتروني الإداري *' : isRu ? 'Рабочий Email *' : 'Official Boutique Email *'}</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@thebedtimestore.bh"
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  <p className="text-[10px] text-gray-500">
                    {isAr ? 'البريد الذي سيستخدمه المشرف لتسجيل الدخول.' : 'Used for administrative login and audit logs.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>{isAr ? 'رقم الهاتف (البحرين) *' : isRu ? 'Телефон *' : 'Phone Number (Bahrain) *'}</span>
                  </label>
                  <div className="flex">
                    <span className="px-2.5 py-2 bg-gray-100 border border-r-0 rtl:border-r rtl:border-l-0 border-[var(--color-border)] text-gray-600 font-mono text-xs rounded-l-xs rtl:rounded-l-none rtl:rounded-r-xs">
                      +973
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="1722 8844"
                      className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-r-xs rtl:rounded-r-none rtl:rounded-l-xs text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Strength Meter */}
              <div className="space-y-2 pt-1">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      <span>{isAr ? 'كلمة المرور الإدارية *' : isRu ? 'Пароль администратора *' : 'Admin Password *'}</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      {isAr ? 'معايير أمان مشددة (8+ خانات)' : 'Strict security standards (8+ chars)'}
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2.5 bg-white border border-[var(--color-border)] rounded-xs text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)] pr-10 rtl:pr-3 rtl:pl-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <PasswordStrengthMeter password={password} showChecklist={true} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text)]">
                    {isAr ? 'تأكيد كلمة المرور الإدارية *' : isRu ? 'Подтвердите пароль *' : 'Confirm Admin Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full px-3 py-2.5 bg-white border rounded-xs text-[var(--color-text)] outline-none pr-10 rtl:pr-3 rtl:pl-10 font-mono ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                          : confirmPassword && password === confirmPassword
                          ? 'border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                          : 'border-[var(--color-border)] focus:ring-1 focus:ring-[var(--color-primary)]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
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
              </div>

              {/* Role Permissions Box */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text)] text-xs flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>{isAr ? 'الصلاحيات الإدارية الممنوحة (Role: Admin)' : 'Assigned Administrator Role'}</span>
                  </span>
                  <span className="text-[10px] font-bold bg-[var(--color-text)] text-white px-2 py-0.5 rounded-xs">
                    Full Access
                  </span>
                </div>
                <ul className="text-[11px] text-[var(--color-text)]/80 space-y-1 list-disc list-inside">
                  <li>{isAr ? 'الوصول الكامل إلى لوحة التحكم الإدارية وإعادة التوجيه التلقائي إليها فور تسجيل الدخول.' : 'Automatic redirection to the Admin Dashboard upon authentication.'}</li>
                  <li>{isAr ? 'صلاحية إنشاء وتعيين مشرفين إضافيين للمتجر.' : 'Authority to create and assign new boutique administrators.'}</li>
                  <li>{isAr ? 'إدارة كتالوج المنتجات، الأقسام، والمخزون والأرصدة في قاعدة بيانات MySQL.' : 'Manage catalog, categories, and inventory balances in MySQL.'}</li>
                  <li>{isAr ? 'الاطلاع على مشتريات العميلات، طلبات الدفع عند الاستلام، وتأكيد رموز QR.' : 'Review customer purchases, COD order verifications, and scan QR POD.'}</li>
                </ul>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 text-xs text-gray-600 hover:text-[var(--color-text)] font-semibold rounded-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isAr ? 'جارٍ تسجيل المشرف في MySQL...' : 'Registering in MySQL...'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{isAr ? 'إنشاء وتأكيد حساب المشرف' : 'Create Administrator Account'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
