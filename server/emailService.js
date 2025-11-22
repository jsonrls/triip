// Email service for sending magic links
// Supports multiple email providers

const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'console';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@trikeconnect.com';

// Send email using Resend (recommended)
async function sendWithResend(email, magicLink) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: 'Sign in to TrikeConnect',
      html: generateEmailTemplate(magicLink),
      text: generateEmailText(magicLink)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${error.message || 'Unknown error'}`);
  }

  return await response.json();
}

// Send email using console (development only)
async function sendWithConsole(email, magicLink) {
  console.log('\n📧 ===== MAGIC LINK EMAIL =====');
  console.log(`To: ${email}`);
  console.log(`Subject: Sign in to TrikeConnect`);
  console.log(`\nClick this link to sign in:\n${magicLink}\n`);
  console.log('================================\n');
  return { success: true, mode: 'console' };
}

// Generate HTML email template
function generateEmailTemplate(magicLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to TrikeConnect</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; background-color: #f8fafc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 32px; text-align: center;">
      <h1 style="color: #1e293b; margin: 0; font-size: 28px; font-weight: bold;">TrikeConnect</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px;">
      <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">Sign in to your account</h2>
      <p style="color: #64748b; margin: 0 0 32px 0; font-size: 16px;">
        Click the button below to securely sign in to your TrikeConnect account. This link will expire in 15 minutes.
      </p>
      
      <!-- Magic Link Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" 
           style="display: inline-block; background-color: #fbbf24; color: #1e293b; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          Sign In to TrikeConnect
        </a>
      </div>
      
      <!-- Alternative Link -->
      <p style="color: #94a3b8; margin: 32px 0 0 0; font-size: 14px; text-align: center;">
        Or copy and paste this link into your browser:<br>
        <a href="${magicLink}" style="color: #3b82f6; word-break: break-all;">${magicLink}</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">
        If you didn't request this link, you can safely ignore this email.
      </p>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 12px;">
        This link expires in 15 minutes.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate plain text email
function generateEmailText(magicLink) {
  return `
Sign in to TrikeConnect

Click the link below to securely sign in to your account:

${magicLink}

This link will expire in 15 minutes.

If you didn't request this link, you can safely ignore this email.
  `;
}

// Main export function
export async function sendMagicLinkEmail(email, magicLink) {
  switch (EMAIL_SERVICE.toLowerCase()) {
    case 'resend':
      return await sendWithResend(email, magicLink);
    
    case 'console':
    default:
      return await sendWithConsole(email, magicLink);
  }
}

