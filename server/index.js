import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { sendMagicLinkEmail } from './emailService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory token storage (in production, use Redis or a database)
const magicLinkTokens = new Map();

// Token expiration: 15 minutes
const TOKEN_EXPIRY = 15 * 60 * 1000;

// Generate secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of magicLinkTokens.entries()) {
    if (now > data.expiresAt) {
      magicLinkTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Endpoint: Send magic link
app.post('/api/auth/magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Generate token
    const token = generateToken();
    const expiresAt = Date.now() + TOKEN_EXPIRY;

    // Store token with email and expiration
    magicLinkTokens.set(token, {
      email,
      expiresAt,
      createdAt: Date.now()
    });

    // Get the frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

    // Send email
    try {
      await sendMagicLinkEmail(email, magicLink);
      console.log(`[Auth] Magic link sent to ${email}`);
      
      res.json({ 
        success: true, 
        message: 'Magic link sent successfully',
        // In development, you might want to return the link for testing
        ...(process.env.NODE_ENV === 'development' && { link: magicLink })
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Still return success in dev mode if email fails
      if (process.env.NODE_ENV === 'development') {
        res.json({ 
          success: true, 
          message: 'Magic link generated (email service unavailable)',
          link: magicLink 
        });
      } else {
        res.status(500).json({ error: 'Failed to send magic link email' });
      }
    }
  } catch (error) {
    console.error('Error in magic link endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint: Verify magic link token
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const tokenData = magicLinkTokens.get(token);

    if (!tokenData) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      magicLinkTokens.delete(token);
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Token is valid, remove it (one-time use)
    magicLinkTokens.delete(token);

    // Return user data
    res.json({
      success: true,
      email: tokenData.email
    });
  } catch (error) {
    console.error('Error in verify endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Auth server running on http://localhost:${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_SERVICE || 'console (dev mode)'}`);
});

