import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Single editable setting for the announcement policy.
 * Change this text to update the store announcement.
 * Set to an empty string ("") to automatically hide the bar.
 */
export const STORE_ANNOUNCEMENT_POLICY = 'Free delivery over 25 BHD · Easy returns across Bahrain & GCC';
export const STORE_ANNOUNCEMENT_POLICY_AR = 'توصيل مجاني للطلبات فوق ٢٥ د.ب · إرجاع واستبدال مرن في البحرين والخليج';
export const STORE_ANNOUNCEMENT_POLICY_RU = 'Бесплатная доставка от 25 BHD · Простой возврат по Бахрейну и странам Залива';

interface AnnouncementBarProps {
  customText?: string;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ customText }) => {
  const { language } = useLanguage();

  const textToDisplay = 
    customText !== undefined 
      ? customText 
      : language === 'ar' 
        ? STORE_ANNOUNCEMENT_POLICY_AR 
        : language === 'ru'
          ? STORE_ANNOUNCEMENT_POLICY_RU
          : STORE_ANNOUNCEMENT_POLICY;

  // If text is not set or empty, hide the bar completely
  if (!textToDisplay || textToDisplay.trim() === '') {
    return null;
  }

  return (
    <aside 
      aria-label="Store announcement"
      className="h-[36px] bg-[#6B1E3F] text-white text-[13px] font-medium px-4 flex items-center justify-center text-center transition-colors select-none tracking-wide"
      style={{ backgroundColor: 'var(--brand-burgundy, #6B1E3F)' }}
    >
      <p className="truncate max-w-7xl mx-auto">
        {textToDisplay}
      </p>
    </aside>
  );
};
