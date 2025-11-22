import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Sparkles } from 'lucide-react';
import { Button, Input, Card } from './ui';
import { sendMagicLink } from '../services/authService';

interface AuthProps {
  onLogin: (user: any) => void;
  onCancel: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onCancel }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('sending');
    setErrorMessage('');
    
    try {
      await sendMagicLink(email);
      setStatus('sent');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to send magic link. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-white shadow-2xl overflow-hidden relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl"></div>

        <div className="p-8 relative z-10">
          <AnimatePresence mode="wait">
            {status === 'idle' || status === 'sending' ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl mx-auto flex items-center justify-center mb-4">
                    <Sparkles size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
                  <p className="text-slate-500">Enter your email to sign in to TrikeConnect</p>
                </div>

                <form onSubmit={handleSendLink} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === 'sending'}
                        autoFocus
                      />
                    </div>
                  </div>
                  {status === 'error' && errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {errorMessage}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={status === 'sending' || !email}
                  >
                    {status === 'sending' ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending Link...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Send Magic Link <ArrowRight size={16} />
                      </span>
                    )}
                  </Button>
                </form>
                
                <div className="text-center">
                   <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                     Cancel
                   </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="link-sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6 py-4"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center animate-bounce">
                  <Mail size={32} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Check your inbox</h3>
                  <p className="text-slate-500 text-sm px-4">
                    We sent a magic link to <br/>
                    <span className="font-semibold text-slate-900">{email}</span>
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-xs text-slate-500">
                    Click the link in your email to sign in. The link will expire in 1 hour.
                  </p>
                  <button 
                    onClick={() => {
                      setStatus('idle');
                      setEmail('');
                      setErrorMessage('');
                    }} 
                    className="text-sm text-slate-400 hover:text-slate-600 block w-full py-2"
                  >
                    Use different email
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
