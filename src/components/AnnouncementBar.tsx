import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { storeConfig } from '../config/storeConfig';

interface AnnouncementBarProps {
  customText?: string;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ customText }) => {
  const { t } = useLanguage();
  const { cms } = useStore();

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storeConfig.announcementDismissStorageKey) === 'true';
    } catch {
      return false;
    }
  });

  if (isDismissed) {
    return null;
  }

  const threshold = Number(cms?.freeDeliveryThresholdBHD ?? storeConfig.freeDeliveryThresholdBHD) || 25;
  const textToDisplay =
    customText !== undefined
      ? customText
      : t.mobileMenu.announcementText.replace('{amount}', String(threshold));

  if (!textToDisplay || textToDisplay.trim() === '') {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storeConfig.announcementDismissStorageKey, 'true');
    } catch {
      // Ignore storage failures in restricted browsing modes
    }
  };

  return (
    <aside
      aria-label="Store announcement"
      className="relative bg-[var(--surface-champagne)] text-[var(--maroon-700)] text-[12px] sm:text-[13px] font-medium px-11 py-2 min-h-[38px] flex items-center justify-center text-center select-none tracking-wide border-b border-[var(--gold-decor)]"
    >
      <p className="max-w-5xl mx-auto leading-snug line-clamp-2 sm:truncate">
        {textToDisplay}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t.mobileMenu.dismissAnnouncement}
        className="absolute inset-y-0 end-0 w-[44px] flex items-center justify-center text-[var(--maroon-700)] hover:text-[var(--maroon-600)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-decor)]"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
};
