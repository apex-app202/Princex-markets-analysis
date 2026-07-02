# Princex Markets Analysis

Deploy (Vercel + Supabase):

1. Push this repo to GitHub (private repo recommended).
2. Import the repo in Vercel.
3. In Vercel Settings, Environment Variables, add all vars from .env.local.example with real values.
4. Set MPESA_CALLBACK_URL to https://your-vercel-domain/api/mpesa/callback
5. In Supabase Authentication URL Configuration, add your Vercel domain to allowed redirect URLs.
6. Deploy.
7. After first deploy, manually promote the admin account by running this in Supabase SQL Editor:
   update users set role = 'admin' where email = 'juniorprincex@gmail.com';

Security notes:
- Never commit .env.local, it is already in .gitignore.
- If this repo is ever made public, rotate the M-Pesa Consumer Secret and Passkey in the Safaricom Daraja dashboard.
- The admin toggle API route re-verifies role = admin server-side on every call.
