# Setting up Custom SMTP in Supabase

To ensure your authentication emails (Sign up, Reset Password, Magic Link) are delivered reliably, you must configure a Custom SMTP provider. Supabase's built-in email service is for testing only and has strict rate limits (3 emails/hour).

## Recommended Provider: Resend
We recommend **Resend** because it is developer-friendly, has a generous free tier (3,000 emails/mo), and integrates perfectly with Supabase.

### Step 1: Create a Resend Account
1. Go to [Resend.com](https://resend.com) and sign up.
2. **Add a Domain**: You need a domain name (e.g., `homematch.pro`).
   - Go to **Domains** -> **Add Domain**.
   - Follow the instructions to add the DNS records (DKIM, SPF, DMARC) to your DNS provider (GoDaddy, Namecheap, Vercel, etc.).
   - Wait for the domain to be **Verified**.

### Step 2: Get SMTP Credentials
1. In Resend, go to **Settings** -> **SMTP**.
2. Or go to **API Keys** and create a new API Key.
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: `re_123456...` (Your API Key)

### Step 3: Configure Supabase
1. Go to your **Supabase Dashboard**.
2. Navigate to **Project Settings** -> **Authentication** -> **SMTP Settings**.
3. Toggle **Enable Custom SMTP** to **ON**.
4. Fill in the details:
   - **Sender Email**: `noreply@homematch.pro` (Must match your verified domain in Resend).
   - **Sender Name**: `HomeMatch`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: Paste your Resend API Key.
   - **Minimum TLS Version**: `TLS1.2` (default is fine).
5. Click **Save**.

### Step 4: Test It
1. Go to your App's Sign Up page.
2. Sign up with a real email address.
3. Check your inbox. The email should arrive instantly and come from your custom domain.

---

## Alternative: AWS SES
If you are already in the AWS ecosystem, SES is the cheapest option at scale.

1. **Verify Domain** in AWS SES Console.
2. **Create SMTP Credentials** in AWS IAM (User -> Security Credentials -> Create SMTP Credentials).
3. Use the provided Host (e.g., `email-smtp.us-east-1.amazonaws.com`), Port (`587`), Username, and Password in Supabase.

## Alternative: SendGrid / Mailgun
The process is similar:
1. Verify Domain.
2. Generate API Key.
3. Use their SMTP Host/Port and API Key as the password.
