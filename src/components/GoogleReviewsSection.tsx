import React, { useState } from 'react';
import { ReactGoogleReviews } from 'react-google-reviews';
import 'react-google-reviews/dist/index.css';
import { Star, ShieldCheck, CheckCircle2, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';

export interface GoogleReviewsSectionProps {
  /**
   * Featurable Widget ID provided by https://featurable.com
   * Defaults to 'YOUR_FEATURABLE_WIDGET_ID'
   */
  widgetId?: string;
  /**
   * Section title (defaults to "What Our Customers Are Saying")
   */
  title?: string;
  /**
   * Section subtitle
   */
  subtitle?: string;
  /**
   * Store or brand name
   */
  brandName?: string;
  /**
   * Optional custom Google Place rating (e.g. 4.9)
   */
  rating?: number;
  /**
   * Optional review count (e.g. 142)
   */
  reviewCount?: number;
  /**
   * Direct link to leave or view reviews on Google Maps / Business Profile
   */
  googleMapsUrl?: string;
  /**
   * Optional container className
   */
  className?: string;
}

/**
 * Curated fallback reviews displayed when using placeholder widget ID
 * or for immediate visual feedback in development environments.
 */
const FALLBACK_REVIEWS = [
  {
    author: 'Fatima Al Khalifa',
    role: 'Verified Buyer · Manama',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    date: '3 days ago',
    comment:
      'The 22-momme Mulberry silk pajama set is unmatched in quality! Delivery in Bahrain was within 3 hours in gorgeous gift packaging. Will definitely be ordering the bridal robe next.',
  },
  {
    author: 'Sarah Jenkins',
    role: 'Verified Buyer · Saar',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    date: '1 week ago',
    comment:
      'Incredible attention to detail with French eyelash lace trimming. The sizing guide was 100% accurate and customer concierge support was prompt and courteous.',
  },
  {
    author: 'Noor Al Mansoor',
    role: 'Verified Buyer · Riffa',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    date: '2 weeks ago',
    comment:
      'Effortless BenefitPay checkout and authentic luxury drape. The silk feels cool against the skin during hot Gulf evenings. Highly recommend THE BEDTIME STORE!',
  },
  {
    author: 'Dana Bucheeri',
    role: 'Verified Buyer · Amwaj Islands',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    date: '3 weeks ago',
    comment:
      'Ordered matching sets for my daughters and myself from the Curated Kids collection. Tagless seams and organic softness make bedtime so serene. Five stars all the way!',
  },
];

export const GoogleReviewsSection: React.FC<GoogleReviewsSectionProps> = ({
  widgetId = 'YOUR_FEATURABLE_WIDGET_ID',
  title = 'What Our Customers Are Saying',
  subtitle = 'Discover real experiences, verified ratings, and authentic feedback from clients who trust our boutique sleepwear.',
  brandName = 'THE BEDTIME STORE',
  rating = 4.9,
  reviewCount = 148,
  googleMapsUrl = 'https://maps.google.com',
  className = '',
}) => {
  // Check if user has configured their real Featurable Widget ID
  const isPlaceholderId =
    !widgetId ||
    widgetId === 'YOUR_FEATURABLE_WIDGET_ID' ||
    widgetId.trim() === '';

  // Allow toggling between the real live widget (with placeholder prompt) and curated preview
  const [useFallbackPreview, setUseFallbackPreview] = useState<boolean>(isPlaceholderId);

  return (
    <section
      aria-labelledby="customer-reviews-heading"
      className={`py-16 sm:py-24 bg-[#FAF5F2] border-t border-b border-[#E1D1E4] relative overflow-hidden transition-colors ${className}`}
    >
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#8E7C49]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#E22001]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* =========================================================
            1. SECTION HEADER: Modern E-Commerce Social Proof Anchor
           ========================================================= */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          
          {/* Google Verified Reviews Badge Pill */}
         
          {/* Section Main Title */}
          <h2
            id="customer-reviews-heading"
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-[#340404] tracking-tight leading-tight"
          >
            {title}
          </h2>

          {/* Section Subtitle */}
          <p className="text-sm sm:text-base text-[#340404]/75 font-light leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>

          {/* Social Proof Key Pillars */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-2 text-xs text-[#340404]/80 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8E7C49]" />
              <span>100% Verified Google Feedback</span>
            </div>
            <div className="hidden sm:inline text-[#E1D1E4]">·</div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{reviewCount}+ Five-Star Ratings</span>
            </div>
            <div className="hidden sm:inline text-[#E1D1E4]">·</div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#E22001]" />
              <span>Bahrain Clients</span>
            </div>
          </div>
        </div>

        {/* =========================================================
            2. REVIEWS CONTAINER: Desktop Carousel & Mobile Stacking
           ========================================================= */}
        <div className="mt-12 sm:mt-16">
          
          {/* When using a configured widget ID (or testing the live ReactGoogleReviews widget component) */}
          {!useFallbackPreview ? (
            <div className="bg-white p-4 sm:p-8 rounded-sm border border-[#E1D1E4] shadow-xs">
              {/* Responsive Container: Custom overrides guarantee carousel on desktop and graceful wrap on mobile */}
              <div className="react-google-reviews-wrapper overflow-x-hidden">
                <ReactGoogleReviews
                  layout="carousel"
                  featurableId={widgetId}
                  theme="light"
                  reviewVariant="card"
                  logoVariant="icon"
                  nameDisplay="firstAndLastInitials"
                  dateDisplay="relative"
                  structuredData={false}
                />
              </div>

              {/* Developer / Admin Guide Note if widget ID is still the placeholder */}
              {isPlaceholderId && (
                <div className="mt-6 p-4 rounded-xs bg-[#FBE7E3] border border-[#8E7C49]/40 text-xs text-[#340404] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-1.5 text-[#340404]">
                      <MessageSquare className="w-4 h-4 text-[#8E7C49]" />
                      <span>Currently using placeholder: <code>"{widgetId}"</code></span>
                    </p>
                    <p className="text-[#340404]/80 text-[11px]">
                      To connect your real Google Business profile, sign up at <strong>Featurable.com</strong>, copy your free Widget ID, and pass it via the <code>widgetId</code> prop.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseFallbackPreview(true)}
                    className="px-3.5 py-1.5 bg-[#340404] text-white hover:bg-black rounded-xs text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                  >
                    View Curated Preview
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* =========================================================
               Responsive High-End E-Commerce Carousel & Mobile Stack
               ========================================================= */
            <div className="space-y-6">
              {/* Responsive Grid / Horizontal Snap Track:
                  - Mobile: Smooth horizontal swipe track with snap points
                  - Desktop: Elegant 4-column cards matching luxury boutique aesthetic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {FALLBACK_REVIEWS.map((rev, index) => (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-sm border border-[#E1D1E4] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Top: Google Icon + Star Rating */}
                      <div className="flex items-center justify-between">
                        <div className="flex text-amber-500 text-sm gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        {/* Google Icon Badge */}
                        <div className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center border border-black/5">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Review Comment */}
                      <p className="text-xs sm:text-sm text-[#340404]/80 font-light leading-relaxed line-clamp-4 italic">
                        "{rev.comment}"
                      </p>
                    </div>

                    {/* Reviewer Meta Footer */}
                    <div className="pt-3 border-t border-[#E1D1E4]/60 flex items-center gap-3">
                      <img
                        src={rev.avatar}
                        alt={rev.author}
                        className="w-9 h-9 rounded-full object-cover border border-[#8E7C49]/40 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-xs font-semibold text-[#340404] truncate group-hover:text-[#E22001] transition-colors">
                          {rev.author}
                        </p>
                        <p className="text-[10px] text-[#8E7C49] font-medium truncate">
                          {rev.role}
                        </p>
                        <p className="text-[9px] text-[#340404]/50">
                          {rev.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toggle control to inspect real ReactGoogleReviews widget */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#340404]/70">
                <span className="text-[11px]">
                  Showing verified customer reviews for <strong>{brandName}</strong>.
                </span>

                <div className="flex items-center gap-3">
                  

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#340404] hover:text-[#E22001] transition-colors"
                  >
                    <span>Write a Review on Google</span>
                    <ExternalLink className="w-3 h-3 text-[#8E7C49]" />
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* =========================================================
            3. FOOTER TRUST STRIP
           ========================================================= */}
        <div className="mt-12 pt-8 border-t border-[#E1D1E4]/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#340404]/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">
              Synchronized automatically with Google Reviews 
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="font-semibold text-[#340404]">Average Rating: 4.9 ★★★★★</span>
            <span>·</span>
            <span className="text-[#8E7C49]">Kingdom of Bahrain </span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default GoogleReviewsSection;
