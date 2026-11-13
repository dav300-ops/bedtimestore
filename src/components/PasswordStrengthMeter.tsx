import React from 'react';
import { analyzePassword, PasswordAnalysis } from '../services/authSecurity';
import { Check, X, Shield, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PasswordStrengthMeterProps {
  password: string;
  showChecklist?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showChecklist = true,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const analysis: PasswordAnalysis = analyzePassword(password);

  if (!password) {
    return null;
  }

  // Segment colors based on score
  const getSegmentColor = (threshold: number) => {
    if (analysis.score < threshold) return 'bg-[var(--line)]';
    if (analysis.score < 30) return 'bg-[var(--red-600)]';
    if (analysis.score < 75) return 'bg-[var(--gold-decor)]';
    return 'bg-[var(--status-success)]';
  };

  const checklistItems = [
    {
      key: 'minLength',
      passed: analysis.checks.minLength,
      textEn: 'At least 8 characters',
      textAr: '8 خانات على الأقل',
    },
    {
      key: 'hasUpper',
      passed: analysis.checks.hasUpper,
      textEn: 'Uppercase letter (A–Z)',
      textAr: 'حرف كبير واحد على الأقل (A–Z)',
    },
    {
      key: 'hasLower',
      passed: analysis.checks.hasLower,
      textEn: 'Lowercase letter (a–z)',
      textAr: 'حرف صغير واحد على الأقل (a–z)',
    },
    {
      key: 'hasNumber',
      passed: analysis.checks.hasNumber,
      textEn: 'Number digit (0–9)',
      textAr: 'رقم واحد على الأقل (0–9)',
    },
    {
      key: 'hasSpecial',
      passed: analysis.checks.hasSpecial,
      textEn: 'Special symbol (!@#$%^&*)',
      textAr: 'رمز خاص واحد على الأقل (!@#$%^&*)',
    },
    {
      key: 'notCommon',
      passed: analysis.checks.notCommon,
      textEn: 'Not easily guessable / common phrase',
      textAr: 'ليست كلمة شائعة أو متداولة',
    },
  ];

  return (
    <div className="space-y-2 mt-1.5 p-3 bg-[var(--surface-page)] rounded-xs border border-[var(--line)]">
      {/* Top Header: Score & Badge */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-[var(--text-strong)]">
          <Shield className="w-3.5 h-3.5 text-[var(--gold-text)]" />
          <span>{isAr ? 'قوة كلمة المرور:' : 'Password Security:'}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-bold border ${
            analysis.level === 'very-strong' || analysis.level === 'strong'
              ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
              : analysis.level === 'fair'
              ? 'bg-[var(--surface-champagne)] text-[var(--gold-text)] border-[var(--gold-decor)]/60'
              : 'bg-[var(--surface-blush)] text-[var(--red-600)] border-[var(--red-600)]/40'
          }`}
        >
          {isAr ? analysis.labelAr : analysis.labelEn} ({analysis.score}%)
        </span>
      </div>

      {/* 4-Bar Gauge Meter */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(20)}`} />
        <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(45)}`} />
        <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(70)}`} />
        <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(90)}`} />
      </div>

      {/* Checklist */}
      {showChecklist && (
        <div className="pt-1.5 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
          {checklistItems.map((item) => (
            <div
              key={item.key}
              className={`flex items-center gap-1.5 transition-colors ${
                item.passed ? 'text-[var(--status-success)] font-medium' : 'text-[var(--text-muted)]'
              }`}
            >
              {item.passed ? (
                <Check className="w-3.5 h-3.5 text-[var(--status-success)] shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              )}
              <span>{isAr ? item.textAr : item.textEn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warning if common */}
      {!analysis.checks.notCommon && (
        <div role="alert" className="flex items-center gap-1.5 text-[11px] text-[var(--red-600)] bg-[var(--surface-blush)] border border-[var(--red-600)]/30 p-1.5 rounded-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isAr
              ? 'تحذير: كلمة المرور هذه ضعيفة جداً ومصنفة ضمن الكلمات الشائعة.'
              : 'Security Warning: This password appears on common compromised password lists.'}
          </span>
        </div>
      )}
    </div>
  );
};
