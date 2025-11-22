<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Triip

A modern ride-sharing platform connecting riders with tricycle drivers, built with React, TypeScript, and Supabase.

View your app in AI Studio: https://ai.studio/apps/drive/1-eJ7GqF2__vHNbE31hwJGMVfDy_QrLUz

## Features

- 🔐 **Magic Link Authentication** - Passwordless login via Supabase
- 🗺️ **Real-time Location Tracking** - GPS-based ride matching
- 🤖 **AI-Powered Route Insights** - Gemini AI integration for route optimization
- 👤 **Dual User Roles** - Support for both riders and drivers
- 📱 **KYC Verification** - Complete identity verification for drivers
- 💬 **In-app Chat** - Real-time communication between riders and drivers
- 📊 **Ride History** - Track all your past rides

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth (Magic Links)
- **Database:** Supabase PostgreSQL
- **Maps:** Leaflet
- **AI:** Google Gemini API
- **Animations:** Framer Motion

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account ([Sign up for free](https://app.supabase.com))
- Google Gemini API key (optional, for AI features)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd triip

# Install dependencies
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase Project:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Fill in your project details and wait for it to be created

2. **Get Your API Keys:**
   - Navigate to **Project Settings** > **API**
   - Copy your **Project URL** and **anon/public key**

3. **Create Environment File:**
   - Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

### 3. Set Up Database

1. **Run the SQL Migration:**
   - In Supabase, go to **SQL Editor**
   - Click "New Query"
   - Copy and paste the contents of `supabase-setup.sql`
   - Click "Run" to execute the migration

   This will create:
   - `profiles` table for user data
   - Row Level Security (RLS) policies
   - Automatic profile creation trigger

   > **Note:** The app will work without the profiles table, but it's recommended for better data management.

### 4. Configure Authentication

1. **Set Redirect URLs:**
   - Go to **Authentication** > **URL Configuration** in Supabase
   - Under "Redirect URLs", add:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://yourdomain.com/auth/callback` (for production)
   - Set **Site URL** to your app's base URL

2. **Configure Email (Optional for Production):**
   - Go to **Project Settings** > **Auth** > **SMTP Settings**
   - Set up your SMTP provider for production emails
   - For development, Supabase's default email service works fine

### 5. Run the Application

```bash
# Start the development server
npm run dev

# Or run both frontend and backend (if using the Express server)
npm run dev:all
```

The app will be available at `http://localhost:3000`

## How Magic Link Authentication Works

1. **User enters email** - On the login screen, users enter their email address
2. **Magic link sent** - Supabase sends an email with a secure magic link
3. **User clicks link** - The link redirects back to your app with authentication tokens
4. **Automatic sign-in** - The app detects the authentication and signs the user in
5. **Session persists** - The user remains signed in until they log out

The magic link expires after 1 hour for security.

## Project Structure

```
triip/
├── components/          # React components
│   ├── Auth.tsx        # Authentication UI
│   ├── Map.tsx         # Map component
│   ├── Chat.tsx        # Chat interface
│   └── KYC.tsx         # KYC verification form
├── services/           # Business logic
│   ├── authService.ts  # Supabase authentication
│   ├── geminiService.ts # AI route insights
│   └── historyService.ts # Ride history
├── lib/                # Utilities
│   └── supabase.ts     # Supabase client configuration
├── server/             # Express backend (optional)
├── types.ts            # TypeScript type definitions
└── App.tsx             # Main application component
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | Optional |

## Troubleshooting

### Magic Link Not Working

- **Check redirect URLs:** Ensure `http://localhost:3000/auth/callback` is added in Supabase
- **Check email:** Look in your spam folder or Supabase logs
- **Check console:** Look for errors in the browser console

### Database Errors

- **Profiles table missing:** Run the SQL migration in `supabase-setup.sql`
- **RLS errors:** Ensure Row Level Security policies are created
- **Connection issues:** Verify your Supabase URL and keys are correct

### Build Issues

- **Clear cache:** Delete `node_modules` and `.vite` folder, then reinstall
- **Check Node version:** Ensure you're using Node.js v18 or higher
- **Environment variables:** Make sure `.env.local` is in the root directory

## Development

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run dev:server` - Start Express backend server
- `npm run dev:all` - Run both frontend and backend concurrently
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Production Deployment

1. **Update environment variables** with production Supabase credentials
2. **Set production redirect URLs** in Supabase dashboard
3. **Configure SMTP** for email delivery
4. **Build the app:** `npm run build`
5. **Deploy** the `dist` folder to your hosting provider

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub or contact the development team.
