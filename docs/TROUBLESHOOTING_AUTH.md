# Authentication Troubleshooting Guide

## 1. Google Sign-in "Authentication Error"

Since your Supabase Redirect URLs look correct, the issue is likely in the **Google Cloud Console** configuration.

### The Common Mistake

In Google Cloud Console, the **Authorized redirect URI** must be your **Supabase Project URL**, NOT your website URL.

### Fix

1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Edit your OAuth 2.0 Client ID.
3. Look at **Authorized redirect URIs**.
4. **It must match this format**:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   _(You can find this exact URL in Supabase Dashboard -> Authentication -> Providers -> Google -> Callback URL)_
5. **It should NOT be**: `https://your-app-domain.com/auth/callback` (This goes in Supabase, not Google).

## 2. Email Verification Issues

You are correct that Supabase's default email provider works for simple tasks, but it has strict limits.

### Troubleshooting Steps

1. **Check Supabase Auth Logs** (Crucial Step):
   - Go to **Supabase Dashboard** -> **Monitor** -> **Logs** -> **Auth**.
   - Look for the sign-up attempt.
   - **If it says "Sent"**: The email was sent. Check your **Spam/Junk** folder.
   - **If it says "Failed"**: Click to see the error. It is likely "Rate limit exceeded" (3 emails/hour).

2. **Rate Limits**:
   - The default limit is ~3 emails per hour per IP. If you tested multiple times quickly, you are likely blocked temporarily.
   - **Fix**: Wait an hour or configure a custom SMTP provider to bypass these limits.

### Summary

- **Google Error**: Fix the URL in Google Cloud Console to point to `supabase.co`, not `homematch.pro`.
- **Email Error**: Check Auth Logs. If "Rate limit exceeded", you must wait or use Custom SMTP.
