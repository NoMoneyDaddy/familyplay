# FamilyPlay Environment Setup Guide

This guide covers setting up environment variables for local development, CI/CD, and production deployments.

---

## Quick Start

### Local Development

```bash
# 1. Copy example file
cp .env.example .env.local

# 2. Edit with your development credentials
nano .env.local

# 3. Start dev server
pnpm dev
```

### CI/CD (GitHub Actions)

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add all secrets from "GitHub Secrets" section below
3. Commit changes to trigger CI/CD

### Production (Zeabur)

1. Go to Zeabur Console → familyplay project → web service
2. Navigate to Settings → Environment Variables
3. Add all environment variables from "Zeabur Configuration" section
4. Redeploy to apply changes

---

## Environment Variables Reference

### Core Application

#### `APP_ENV`

**Description**: Application environment identifier

**Values**:
- `development` - Local development
- `staging` - Staging environment
- `production` - Production environment

**Used In**:
- Mobile: `eas.json` build profiles
- Web: Sentry release tracking
- All: Feature flags and API selection

---

### Supabase Configuration

```bash
# Public API URL
SUPABASE_URL=https://your-project.supabase.co

# Public anonymous key (safe in browser)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend service role key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL for migrations
SUPABASE_DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
PRODUCTION_DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
```

---

### Authentication

```bash
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefg
GOOGLE_CLIENT_ID_MOBILE=123456789-mobile.apps.googleusercontent.com
```

---

### Rate Limiting & Caching

```bash
# Upstash Redis (10 requests per minute per user limit)
UPSTASH_REDIS_REST_URL=https://coherent-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### AI Providers

```bash
# Google Gemini
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security**: Never log API keys or store in database. Keys are released after request completion.

---

### Payment & Subscriptions

```bash
# LemonSqueezy
LEMONSQUEEZY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxx

# RevenueCat (mobile subscriptions)
REVENUECAT_API_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REVENUECAT_SECRET_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
```

---

### Error Tracking & Monitoring

```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org
SENTRY_PROJECT=familyplay
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENTRY_ENVIRONMENT=production

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com
```

---

### Notifications

```bash
# Telegram Bot (deploy notifications)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890
```

---

### Mobile Signing Certificates

#### iOS (App Store)

```bash
# ASC API Configuration
APPLE_ASC_API_ISSUER_ID=12345678-1234-1234-1234-123456789012
APPLE_ASC_API_KEY_ID=ABC1234567
APPLE_ASC_API_KEY_PATH=<base64-encoded P8 file>
APPLE_TEAM_ID=ABCD123456

# Distribution Certificate
APPLE_DIST_CERT=<base64-encoded P12 file>
APPLE_DIST_CERT_PASSWORD=certificate-password
APPLE_PROVISIONING_PROFILE=<base64-encoded mobileprovision file>
```

**Setup Instructions**:
1. Base64 encode Apple API key: `base64 -i apple-api-key.p8`
2. Base64 encode distribution certificate: `base64 -i cert.p12`
3. Base64 encode provisioning profile: `base64 -i profile.mobileprovision`
4. Add to GitHub Secrets (never commit)

#### Android (Google Play)

```bash
# Google Play Service Account
GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=<base64-encoded JSON key>

# Keystore Configuration
ANDROID_KEYSTORE=<base64-encoded keystore>
ANDROID_KEYSTORE_PASSWORD=keystore-password
ANDROID_KEY_ALIAS=familyplay
ANDROID_KEY_PASSWORD=key-password
```

**Setup Instructions**:
1. Create service account in Google Cloud Console
2. Base64 encode JSON key: `base64 -i service-account.json`
3. Generate keystore: `keytool -genkey -v -keystore familyplay.keystore ...`
4. Base64 encode keystore: `base64 -i familyplay.keystore`
5. Add to GitHub Secrets (never commit)

---

## GitHub Secrets Setup

All CI/CD secrets must be in GitHub repository (Settings → Secrets and variables → Actions):

| Name | Purpose |
|---|---|
| `EXPO_TOKEN` | EAS Build authentication |
| `SENTRY_ORG` | Error tracking organization |
| `SENTRY_PROJECT` | Error tracking project |
| `SENTRY_AUTH_TOKEN` | Sentry API token |
| `TELEGRAM_BOT_TOKEN` | Deploy notifications |
| `TELEGRAM_CHAT_ID` | Deploy notification channel |
| `PRODUCTION_DATABASE_URL` | Supabase production DB |
| `APPLE_ASC_API_ISSUER_ID` | App Store Connect issuer ID |
| `APPLE_ASC_API_KEY_ID` | App Store Connect key ID |
| `APPLE_ASC_API_KEY_PATH` | Base64-encoded P8 key |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH` | Base64-encoded service account JSON |
| `APPLE_DIST_CERT` | Base64-encoded P12 certificate |
| `APPLE_DIST_CERT_PASSWORD` | Distribution certificate password |
| `APPLE_PROVISIONING_PROFILE` | Base64-encoded provisioning profile |
| `ANDROID_KEYSTORE` | Base64-encoded keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias name |
| `ANDROID_KEY_PASSWORD` | Key password |

---

## Zeabur Configuration

### Dashboard Setup

1. Go to [Zeabur Console](https://console.zeabur.com)
2. Select `familyplay` project → `web` service
3. Settings → Environment Variables
4. Add all variables from below
5. Redeploy to apply changes

### Required Variables for Zeabur

```bash
APP_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Auth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://coherent-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Providers
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Payment
LEMONSQUEEZY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxx

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org
SENTRY_PROJECT=familyplay
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENTRY_ENVIRONMENT=production

NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com
```

---

## EAS Build Environment Variables

Environment variables for mobile builds are configured in:
1. `eas.json` - Build profiles (public vars)
2. GitHub Secrets - CI/CD variables
3. EAS secrets - Sensitive values (encrypted)

### Via eas.json

```json
{
  "build": {
    "production": {
      "env": {
        "APP_ENV": "production",
        "SUPABASE_URL": "https://project.supabase.co",
        "SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

### Via EAS Secrets (Recommended)

```bash
eas secret:create --scope production --name GEMINI_API_KEY
```

---

## Base64 Encoding Reference

### Encode a File

```bash
# macOS / Linux
base64 -i filename > filename-base64.txt

# Or with openssl
openssl base64 -in filename -out filename-base64.txt
```

### Decode a String

```bash
echo "base64string" | base64 -d > filename
```

### Python

```python
import base64

# Encode
with open('file.p8', 'rb') as f:
    print(base64.b64encode(f.read()).decode())

# Decode
encoded = "ABC..."
with open('file.p8', 'wb') as f:
    f.write(base64.b64decode(encoded))
```

### JavaScript

```javascript
const fs = require('fs');

// Encode
const file = fs.readFileSync('file.p8');
console.log(Buffer.from(file).toString('base64'));

// Decode
const encoded = "ABC...";
fs.writeFileSync('file.p8', Buffer.from(encoded, 'base64'));
```

---

## Security Best Practices

1. **Never Commit Secrets**
   - Add to `.gitignore`: `*.keystore`, `*.p12`, `*.p8`, `service-account.json`
   - Always use `.env.local` for local secrets

2. **Use GitHub Secrets for CI/CD**
   - All sensitive values go to GitHub Secrets
   - CI/CD reads from `${{ secrets.SECRET_NAME }}`
   - Secrets are automatically masked in logs

3. **Rotate Certificates Regularly**
   - iOS: Renew every 1-3 years
   - Android: 25-year validity (sufficient)
   - API Keys: Regenerate if compromised

4. **Environment-Specific Keys**
   - Use separate keys for development, staging, production
   - Never use production keys for testing
   - Reduces risk if a key is leaked

5. **Audit Secret Access**
   - GitHub: Settings → Security log shows usage
   - Supabase: Dashboard → Logs shows authentication
   - GCP / Apple: Review API key usage

---

## Troubleshooting

### Secret Not Loading

**Problem**: `SUPABASE_URL is undefined`

**Solutions**:
1. Check `.env.local` exists and has the correct value
2. Verify env var name matches code
3. For `NEXT_PUBLIC_*` vars, rebuild Next.js
4. Restart dev server

### Base64 Encoding Issues

```bash
# Try openssl if base64 fails
openssl base64 -in file.p8 -out file-base64.txt

# Or use Python
python3 -c "import base64; print(base64.b64encode(open('file.p8', 'rb').read()).decode())"
```

### Certificate Expired

```bash
# Check expiry
openssl pkcs12 -in cert.p12 -noout -info  # iOS
keytool -list -v -keystore keystore.jks   # Android
```

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [CLAUDE.md](../CLAUDE.md) - Project guidelines
- [.env.example](../.env.example) - All available env vars
