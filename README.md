# THE BEDTIME STORE:

A production-ready, elegant, fully responsive e-commerce web application for **THE BEDTIME STORE**, a Bahrain-based luxury boutique specializing in women's nightwear and sleepwear fashion.

---

## 1. Brand Design System & Color Tokens

Built exclusively with the official brand color palette using CSS variables and Tailwind theme tokens:

| Token | Name | Hex | Role |
| :--- | :--- | :--- | :--- |
| `--color-dogwood` | Dogwood | `#FBE7E3` | Primary page background, cards, footer, soft sections |
| `--color-scarlet` | Scarlet | `#E22001` | Primary CTA buttons, sale badges, discount tags, low stock warnings |
| `--color-pastel-day` | Pastel Day | `#E1D1E4` | Secondary background, category tiles, hover states, selected variant fills |
| `--color-rural-green` | Rural Green | `#8E7C49` | Accents, dividers, rating stars, "New" tags, in-stock indicators |
| `--color-black-bean` | Black Bean | `#340404` | Primary text, headings, header, admin sidebar |

### Typography
- **Headings**: `Cormorant Garamond` (English) & `Amiri` (Arabic)
- **Body & UI**: `Montserrat` (English) & `Noto Sans Arabic` (Arabic)

---

## 2. Bahrain Market Integration

- **Primary Currency**: BHD (Bahraini Dinar) formatted to 3 decimal places (`18.500 BHD` / `١٨.٥٠٠ د.ب`).
- **Addresses**: Tailored to Bahrain addresses (`Building / Villa`, `Road / Street`, `Block`, `Area` e.g. Adliya, Seef, Saar, Amwaj, Riffa, Manama).
- **Mobile Numbers**: Bahrain phone validation (`+973 39XX XXXX`).
- **Delivery Options**:
  - Standard Delivery (1-2 Days): `1.500 BHD` (Complimentary for orders above `25.000 BHD`)
  - Same-Day Express Delivery: `2.500 BHD`
- **GCC-Ready**: Architecture modularized to allow expansion to Saudi Arabia, UAE, Kuwait, Qatar, and Oman.

---

## 3. Bilingual English & Arabic RTL System

- Full left-to-right (LTR) and right-to-left (RTL) flipping via interactive language switcher (`EN | العربية`).
- Automatic `document.documentElement.dir` and `lang` switching.
- Every product and category features dedicated English and Arabic titles, descriptions, materials, and care guides.

---

## 4. Payment Architecture

Constructed with a provider abstraction layer (`PaymentService`):

```
PaymentService
    ├── BenefitPayProvider (Bahrain Benefit QR & Fawri+ national payment network)
    ├── ApplePayProvider (Biometric Apple Pay sheet flow)
    └── VisaProvider (PCI-DSS tokenized card processing)
```

No raw credit card numbers or CVVs are ever stored in the MySQL database.

---

## 5. Development & Demo Credentials

- **Customer Account Demo**: `fatima@thebedtimestore.bh` (Password: `LuxurySilk@2026`)
- **Administrator Portal Demo**: `admin@thebedtimestore.bh` (Password: `Admin@Bedtime2026!`)
  - Access via "Admin Portal" button in the top navigation or footer.
  - Allows full management of products, inventory per variant, categories, orders, coupon promotions, and CMS content.

---

## 6. Project Architecture & MySQL Database

```
├── src/
│   ├── assets/images/      # High-fidelity boutique photography assets
│   ├── components/         # Header, Footer, HeroBanner, ProductCard, Carousel, Modals, Drawer
│   ├── context/            # LanguageContext, StoreContext, AuthContext, CartContext
│   ├── data/               # Seed catalog, Bahrain addresses, demo orders, coupons
│   ├── i18n/               # English & Arabic translation dictionaries
│   ├── pages/              # HomePage, ShopPage, PDP, Checkout, OrderConfirmation, Account, Admin
│   ├── services/           # Payment provider abstraction (MyFatoorah, BenefitPay, Apple Pay)
│   ├── types/              # Comprehensive TypeScript interfaces
│   └── index.css           # Design tokens, variables & typography
├── server/
│   ├── db.ts               # MySQL connection pool & resilient fallback engine
│   ├── queries/            # Parameterized MySQL queries (Auth, Categories, Products, Orders)
│   ├── routes/             # RESTful API endpoints (/api/auth, /api/categories, /api/products, etc.)
│   └── services/           # authService, categoryService, inventoryService, PaymentService
├── index.html              # Head meta, Cormorant Garamond & Amiri fonts
└── metadata.json           # Application descriptor
```

---

## 7. Testing & Quality Checks

Run TypeScript type check and verification:
```bash
npm run lint
npm run build
```
