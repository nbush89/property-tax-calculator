# Feedback Form Setup

The feedback form is now integrated into the homepage. To enable email sending, follow these steps:

## Option 1: Using Resend (Recommended)

1. **Install Resend:**
   ```bash
   npm install resend
   ```

2. **Get a Resend API Key:**
   - Sign up at https://resend.com
   - Go to API Keys section
   - Create a new API key
   - Copy the key (starts with `re_`)

3. **Add to your `.env.local` file:**
   ```env
   FEEDBACK_EMAIL=your-email@gmail.com
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=your-verified-email@yourdomain.com
   ```
   
   **Note:** If `FEEDBACK_EMAIL` is not set, it defaults to `rheosdigital@gmail.com`

4. **Verify your domain** (optional but recommended):
   - In Resend dashboard, go to Domains
   - Add and verify your domain
   - Update `RESEND_FROM_EMAIL` to use your verified domain

## Option 2: Using Other Email Services

You can modify `app/api/feedback/route.ts` to use:
- **SendGrid**: `npm install @sendgrid/mail`
- **AWS SES**: `npm install @aws-sdk/client-ses`
- **Nodemailer**: `npm install nodemailer` (requires SMTP credentials)

## Environment Variables

- **FEEDBACK_EMAIL** (optional): Email address to receive feedback. Defaults to `rheosdigital@gmail.com` if not set.
- **RESEND_API_KEY** (optional): Resend API key for sending emails. Required for email functionality.
- **RESEND_FROM_EMAIL** (optional): Email address to send from. Defaults to `onboarding@resend.dev` if not set.

## Current Behavior

- **Without email service**: Feedback is logged to the console (useful for development)
- **With Resend configured**: Feedback is sent to the email address specified in `FEEDBACK_EMAIL` (or default)

## Testing

1. Start your development server: `npm run dev`
2. Navigate to the homepage
3. Scroll to the "We'd Love Your Feedback" section
4. Fill out and submit the form
5. Check your email inbox (if Resend is configured) or server logs (if not)

## Form Fields

- **Name**: Optional
- **Email**: Optional (only if you want a response)
- **Message**: Required (feedback content)

The form includes:
- Client-side validation
- Loading states
- Success/error messages
- Spam protection (message length limit)

