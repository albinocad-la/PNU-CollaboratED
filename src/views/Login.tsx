import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Login was cancelled. Please try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for login. Please add ' + window.location.hostname + ' to your Firebase Authorized Domains.');
      } else {
        setError(`Login error (${error.code || 'unknown'}): ${error.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 text-center"
      >
        <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg shadow-indigo-500/20">
          P
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">PNU CollaboratED</h1>
        <p className="text-slate-400 mb-8">Collaborate, study, and excel with your peers at Philippine Normal University.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-4 px-6 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${
            loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-100'
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          )}
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        
        <p className="mt-8 text-xs text-slate-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
