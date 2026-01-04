import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to handle feedback form submissions
 * Sends feedback to the configured email address using Resend
 */
const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || 'rheosdigital@gmail.com'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message } = body

    // Validate required fields
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Basic spam protection - check message length
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long. Please keep it under 5000 characters.' },
        { status: 400 }
      )
    }

    // Prepare email content
    const emailSubject = `Feedback from NJ Property Tax Calculator${name ? ` - ${name}` : ''}`
    const emailBody = `
New feedback submission:

${name ? `Name: ${name}` : 'Name: Not provided'}
${email ? `Email: ${email}` : 'Email: Not provided'}

Message:
${message}

---
Submitted at: ${new Date().toISOString()}
User Agent: ${request.headers.get('user-agent') || 'Unknown'}
IP Address: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'}
    `.trim()

    // Try to use Resend if available, otherwise fall back to logging
    let emailSent = false
    
    // Check if Resend is available and configured
    if (process.env.RESEND_API_KEY) {
      try {
        // Dynamic import to avoid errors if Resend is not installed
        // @ts-ignore - Resend may not be installed
        const { Resend } = await import('resend')
        
        // @ts-ignore
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        // Get the from email from env or use a default
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        
        // @ts-ignore
        await resend.emails.send({
          from: fromEmail,
          to: FEEDBACK_EMAIL,
          subject: emailSubject,
          text: emailBody,
        })
        
        emailSent = true
      } catch (resendError) {
        // Resend not configured or not installed - fall through to logging
        console.warn('Resend not available, logging feedback instead:', resendError)
      }
    }

    // If Resend is not configured, log the feedback for manual review
    if (!emailSent) {
      console.log('=== FEEDBACK SUBMISSION (Email not configured) ===')
      console.log('To:', FEEDBACK_EMAIL)
      console.log('Subject:', emailSubject)
      console.log('Body:', emailBody)
      console.log('================================================')
      console.log('')
      console.log('To enable email sending:')
      console.log('1. Install Resend: npm install resend')
      console.log('2. Get API key from https://resend.com')
      console.log('3. Add to .env: RESEND_API_KEY=re_xxxxx')
      console.log('4. Optionally set RESEND_FROM_EMAIL=your-verified-email@yourdomain.com')
    }

    return NextResponse.json(
      { message: 'Feedback submitted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing feedback:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

