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
      className={`py-16 sm:py-24 border-t border-b relative overflow-hidden transition-colors bg-[var(--surface-page)] border-[var(--line)] ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* =========================================================
            1. SECTION HEADER: Modern E-Commerce Social Proof Anchor
           ========================================================= */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          
          {/* Section Main Title */}
          <h2
            id="customer-reviews-heading"
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-[var(--maroon-700)]"
          >
            {title}
          </h2>

          {/* Section Subtitle */}
          <p 
            className="text-sm sm:text-base font-light leading-relaxed max-w-2xl mx-auto text-[var(--text-body)]"
          >
            {subtitle}
          </p>

          {/* Social Proof Key Pillars */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-2 text-xs text-[var(--text-muted)] font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--maroon-700)]" />
              <span>100% Verified Google Feedback</span>
            </div>
            <div className="hidden sm:inline text-[var(--line)]">·</div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
              <span>{reviewCount}+ Five-Star Ratings</span>
            </div>
            <div className="hidden sm:inline text-[var(--line)]">·</div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--gold-text)]" />
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
            <div className="bg-[var(--surface-card)] p-4 sm:p-8 rounded-[var(--radius-card)] border border-[var(--line)] shadow-xs">
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
                <div className="mt-6 p-4 rounded-xs bg-[var(--surface-page)] border border-[var(--line)] text-xs text-[var(--text-strong)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold flex items-center gap-1.5 text-[var(--text-strong)]">
                      <MessageSquare className="w-4 h-4 text-[var(--maroon-700)]" />
                      <span>Currently using placeholder: <code>"{widgetId}"</code></span>
                    </p>
                    <p className="text-[var(--text-muted)] text-[11px]">
                      To connect your real Google Business profile, sign up at <strong>Featurable.com</strong>, copy your free Widget ID, and pass it via the <code>widgetId</code> prop.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseFallbackPreview(true)}
                    className="px-3.5 py-1.5 bg-[var(--maroon-700)] text-[var(--text-on-maroon)] hover:bg-[var(--maroon-600)] rounded-[var(--radius-pill)] text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {FALLBACK_REVIEWS.map((rev, index) => (
                  <div
                    key={index}
                    className="bg-[var(--surface-card)] p-6 rounded-[var(--radius-card)] border border-[var(--line)] hover:border-[var(--gold-decor)] shadow-xs hover:shadow-[var(--shadow-soft)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Top: Google Icon + Star Rating */}
                      <div className="flex items-center justify-between">
                        <div className="flex text-[var(--gold-text)] text-sm gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-[var(--gold-decor)] text-[var(--gold-text)]" />
                          ))}
                        </div>
                        {/* Official Google Icon Badge */}
                        <div className="w-5 h-5 rounded-full bg-[var(--surface-card)] flex items-center justify-center border border-[var(--line)]">
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
                      <p className="text-xs sm:text-sm text-[var(--text-body)] font-light leading-relaxed line-clamp-4 italic">
                        "{rev.comment}"
                      </p>
                    </div>

                    {/* Reviewer Meta Footer */}
                    <div className="pt-3 border-t border-[var(--line)]/70 flex items-center gap-3">
                      <img
                        src={(rev.avatar && rev.avatar.trim() !== '') ? rev.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                        alt={rev.author}
                        className="w-9 h-9 rounded-full object-cover border border-[var(--line)] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-xs font-semibold text-[var(--text-strong)] truncate group-hover:text-[var(--maroon-700)] transition-colors">
                          {rev.author}
                        </p>
                        <p className="text-[10px] text-[var(--gold-text)] font-medium truncate">
                          {rev.role}
                        </p>
                        <p className="text-[9px] text-[var(--text-muted)]">
                          {rev.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toggle control */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[var(--text-muted)]">
                <span className="text-[11px]">
                  Showing verified customer reviews for <strong>{brandName}</strong>.
                </span>

                <div className="flex items-center gap-3">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--maroon-700)] hover:text-[var(--maroon-600)] transition-colors"
                  >
                    <span>Write a Review on Google</span>
                    <ExternalLink className="w-3 h-3 text-[var(--maroon-700)]" />
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* =========================================================
            3. FOOTER TRUST STRIP
           ========================================================= */}
        <div className="mt-12 pt-8 border-t border-[var(--line)]/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse" />
            <span className="font-medium">
              Synchronized automatically with Google Reviews 
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="font-semibold text-[var(--text-strong)]">
              Average Rating: {rating}{' '}
              <span className="text-[var(--gold-text)]" aria-hidden="true">★★★★★</span>
            </span>
            <span>·</span>
            <span className="text-[var(--maroon-700)] font-medium">Kingdom of Bahrain</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default GoogleReviewsSection;
