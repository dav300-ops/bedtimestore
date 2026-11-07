# Deluxe Bedtime Store

A luxury women's sleepwear and lingerie e-commerce web application based in Bahrain, featuring bilingual English/Arabic RTL shopping, BenefitPay checkout, and full dual-environment support (Development and Production).

---

## 1. Environment Support: Development & Production

The application operates identically in both Development and Production modes through strict environment configuration with zero code-path divergences.

### Configuration Matrix

| Variable | Type | Default (Dev) | Production Requirement | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | `development` | `production` | Active runtime mode |
| `PORT` | Number | `3000` | Cloud port (e.g. `8080` / `3000`) | Server HTTP port |
| `DB_HOST` | String | `localhost` | **Required** | MySQL database host / hostname |
| `DB_PORT` | Number | `3306` | `3306` | MySQL port |
| `DB_USER` | String | `thebedtime_str` | **Required** | MySQL username |
| `DB_PASSWORD` | String | (Local dev pass) | **Required** | MySQL password |
| `DB_NAME` | String | `thebedtime_store`| **Required** | MySQL database name |
| `DB_SSL` | Boolean| `false` | `true` | Enable TLS/SSL connection to MySQL |
| `CORS_ORIGIN`| String | `http://localhost:3000` | **Required** (e.g. `https://thebedtime.store`) | Whitelisted CORS origin (no wildcards) |
| `VITE_API_BASE_URL` | String | `""` (relative `/api`) | `""` (relative `/api`) | Client API base path |

Templates provided:
- `.env.example`: Committed reference template with sanitized documentation.
- `.env.development`: Pre-configured local development settings.
- `.env.production`: Production-ready cloud deployment template.

*(Real `.env`, `.env.production`, and `.env.local` files are ignored by git in `.gitignore`)*.

---

## 2. Run in Development

In development mode:
- Express API and Vite development server run together seamlessly.
- `/api` requests are proxied directly to `http://localhost:3000`.
- Cache TTL is set to **1 minute** so catalog modifications appear quickly.
- Verbose logging is enabled on both console and API responses (including SQL error codes and messages).
- A visible **"Clear cache"** toolbar appears in the lower-left corner of the browser.

```bash
# 1. Install dependencies
npm install

# 2. Run development server (runs Express + Vite HMR on port 3000)
npm run dev
```

Visit `http://localhost:3000`.

---

## 3. Deploy to Production

In production mode:
- The frontend is compiled into optimized static assets in the `dist/` directory via `vite build`.
- Single-process server: Express serves `dist/` statically and routes unknown requests to `dist/index.html` (SPA fallback).
- No Vite process runs in production.
- Strict security headers applied via `helmet`.
- CORS is strictly locked down to `CORS_ORIGIN` (no wildcards permitted).
- Rate limiting is enforced on login, registration, and write endpoints.
- Error responses sent to clients contain only generic messages and a unique traceable `errorId` (detailed logs with stack traces are retained exclusively on the server).
- Connection pool with `connectionLimit: 10`, `waitForConnections: true`, `enableKeepAlive: true`, and automatic 1-retry on dropped database connections.
- Cache TTL is extended to **10 minutes** with build version invalidation (`v1.0.0`).
- Graceful shutdown handles `SIGTERM` and `SIGINT` by closing active HTTP connections and draining the MySQL connection pool.

```bash
# 1. Install dependencies
npm install

# 2. Build production frontend
npm run build

# 3. Validate environment & start production Express server
npm run start
# Or explicitly:
npm run start:prod
```

---

## 4. Health Check & Diagnostics

The application provides a universal health monitoring endpoint:

```
GET /api/health
```

Example JSON response:
```json
{
  "status": "ok",
  "db": "up",
  "env": "production",
  "version": "v1.0.0",
  "timestamp": "2026-11-07T08:15:00.000Z"
}
```

---

## 5. Troubleshooting & FAQ

#### Missing Environment Variables on Startup
- **Symptom**: Server immediately terminates in production with `[CONFIG FATAL ERROR] Missing required production environment variables`.
- **Solution**: Ensure `DB_HOST`, `DB_USER`, `DB_NAME`, and `CORS_ORIGIN` are exported in your environment or defined in `.env.production`.

#### MySQL Connection Failure or Dropped Packet
- **Symptom**: `ECONNRESET` or `PROTOCOL_CONNECTION_LOST`.
- **Solution**: The database module automatically triggers a single retry on dropped connection errors. If the database remains unreachable, the server falls back to the resilient in-memory database engine and persists modifications to `server/data/persisted_db.json`.

#### Stale Cache During Development
- **Symptom**: Changes made to catalog categories or products do not appear immediately.
- **Solution**: Click the visible **"Clear cache"** button on the development toolbar in the bottom-left corner of the browser, or send `POST /api/cache/clear`.

#### CORS Errors in Production
- **Symptom**: Browser blocks requests with `Cross-Origin Request Blocked`.
- **Solution**: Verify that `CORS_ORIGIN` matches the exact protocol and domain of your production frontend (e.g., `https://thebedtime.store`).

---

## 6. Environment Verification Checklist

Use this checklist to verify that both modes behave correctly:

### Development Mode Verification
- [x] Run `npm run dev` and confirm server starts in `DEVELOPMENT` mode.
- [x] Send `GET /api/health` and verify `{ status: "ok", env: "development" }`.
- [x] Verify visible "Clear cache" button is displayed on the bottom-left of the screen.
- [x] Click "Clear cache" and verify notification badge shows "Cache cleared".
- [x] Trigger an invalid request and confirm verbose error details (code, message) appear in the response.

### Production Mode Verification
- [x] Run `npm run build` and ensure `dist/` is generated cleanly.
- [x] Start server with `NODE_ENV=production npm start`.
- [x] Ensure Vite is not loaded into memory and static files are served from `dist/`.
- [x] Verify "Clear cache" button is completely absent from the UI.
- [x] Trigger an error and confirm client receives generic error message and an `errorId`.
- [x] Send `SIGINT` (Ctrl+C) and observe graceful pool shutdown logs.

---

## 7. Demo Accounts

- **Administrator**: `admin@thebedtimestore.bh` (Password: `Admin@Bedtime2026!`)
- **Customer**: `fatima@thebedtimestore.bh` (Password: `LuxurySilk@2026`)
