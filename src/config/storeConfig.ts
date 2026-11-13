import { Language } from '../types';

export interface StoreConfig {
  brandName: string;
  domain: string;
  freeDeliveryThresholdBHD: number;
  standardShippingFeeBHD: number;
  expressShippingFeeBHD: number;
  whatsappPhoneRaw: string;
  whatsappPhoneDisplay: string;
  announcementDismissStorageKey: string;
  defaultSeasonEyebrow: Record<Language, string>;
}

export const storeConfig: StoreConfig = {
  brandName: 'Deluxe Bedtime Store',
  domain: 'thebedtimestore.com',
  freeDeliveryThresholdBHD: 25,
  standardShippingFeeBHD: 1.5,
  expressShippingFeeBHD: 2.5,
  whatsappPhoneRaw: '97339664739',
  whatsappPhoneDisplay: '+973 3966 4739',
  announcementDismissStorageKey: 'bedtime_announcement_dismissed_v1',
  defaultSeasonEyebrow: {
    en: 'Spring / Summer 2026 Collection',
    ar: 'مجموعة ربيع / صيف ٢٠٢٦',
    ru: 'Коллекция Весна / Лето 2026',
    fr: 'Collection Printemps / Été 2026',
  },
};
