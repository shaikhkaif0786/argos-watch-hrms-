import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { UserRole } from '../../types/hrms';
import { isSupabaseConfigured, getSupabaseConfig } from '../../lib/supabase';

export const LoginPage: React.FC = () => {
  const { signInWithEmailOrPhone, theme, setTheme, addToast } = useHRMS();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabaseActive = isSupabaseConfigured();
  const supabaseSource = getSupabaseConfig().source;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email address or mobile number.');
      return;
    }

    if (authMode === 'password' && !password.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    if (authMode === 'otp' && !otpSent) {
      // Send OTP phase
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setOtpSent(true);
        addToast('OTP Sent', `6-digit verification code sent to ${identifier}.`, 'info');
      }, 600);
      return;
    }

    if (authMode === 'otp' && otpSent && !otpCode.trim()) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmailOrPhone(
        identifier,
        authMode === 'otp' ? otpCode : password,
        authMode
      );
      if (!res.success) {
        setErrorMessage(res.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (
    demoEmail: string,
    demoPhone: string,
    roleName: string
  ) => {
    setLoading(true);
    try {
      await signInWithEmailOrPhone(demoEmail, 'demo123', 'password');
    } finally {
      setLoading(false);
    }
  };

  const isEmailInput = identifier.includes('@');
  const isPhoneInput = /\d{6,}/.test(identifier);

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col justify-between selection:bg-[#000000] selection:text-white dark:selection:bg-white dark:selection:text-[#000000]">
      {/* Top Header Row */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#1C1C1E] bg-white/70 dark:bg-[#161618]/70 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#000000] dark:bg-white text-white dark:text-[#000000] flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              Argos HRMS
            </h1>
            <p className="text-[11px] text-[#86868B]">
              Enterprise Human Resource & Biometric Management
            </p>
          </div>
        </div>

        {/* Theme Switcher & Supabase Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
              supabaseActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>
              {supabaseActive ? `Supabase Connected (${supabaseSource})` : 'Supabase Pending Credentials'}
            </span>
          </div>

          <div className="flex items-center p-1 bg-[#F0F0F2] dark:bg-[#1C1C1E] rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                theme === 'light'
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs font-medium'
                  : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                theme === 'dark'
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs font-medium'
                  : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                theme === 'system'
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs font-medium'
                  : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
              title="System Default"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Card Wrapper */}
          <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Sign in to HRMS
                </h2>
                <div className="flex items-center gap-1 text-xs text-[#86868B]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Secure OAuth &amp; SSL</span>
                </div>
              </div>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">
                Enter your official email address or registered mobile number to access your workspace.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Auth Mode Segmented Selector */}
            <div className="flex items-center p-1 bg-[#F0F0F2] dark:bg-[#202022] rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password');
                  setOtpSent(false);
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                  authMode === 'password'
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setOtpSent(false);
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                  authMode === 'otp'
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                    : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                Mobile / Email OTP
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                  Email Address or Mobile Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[#86868B]">
                    {isPhoneInput ? (
                      <Phone className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="argos.subscription04@gmail.com or +91 98200 00001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7] transition-all"
                  />
                </div>
                {identifier && (
                  <p className="text-[11px] text-[#86868B] mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>
                      Detected input type: {isEmailInput ? 'Email Address' : isPhoneInput ? 'Mobile Phone Number' : 'Employee ID / Account'}
                    </span>
                  </p>
                )}
              </div>

              {/* Password or OTP input */}
              {authMode === 'password' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Password
                    </label>
                    <span className="text-[11px] text-[#86868B]">Default: demo123</span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-[#86868B]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : otpSent ? (
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="1 2 3 4 5 6"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl text-center text-sm tracking-widest font-mono text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7]"
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-[#86868B]">Code sent to {identifier}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>
                      {authMode === 'otp' && !otpSent
                        ? 'Send Verification Code'
                        : 'Sign In to Workspace'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Persona Shortcuts */}
            <div className="pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#86868B] font-medium">
                <span>Quick Role Demo Shortcuts:</span>
                <span>Select to test role</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      'argos.subscription04@gmail.com',
                      '+91 98200 00001',
                      'Admin'
                    )
                  }
                  className="p-2.5 rounded-xl bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] text-left hover:border-[#1D1D1F] dark:hover:border-[#F5F5F7] transition-all cursor-pointer group"
                >
                  <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Admin Workspace
                  </div>
                  <div className="text-[10px] text-[#86868B]">Full System Controller</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoLogin(
                      'argos.subscription04@gmail.com',
                      '+91 98200 00001',
                      'HR'
                    )
                  }
                  className="p-2.5 rounded-xl bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] text-left hover:border-[#1D1D1F] dark:hover:border-[#F5F5F7] transition-all cursor-pointer group"
                >
                  <div className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                    HR Workspace
                  </div>
                  <div className="text-[10px] text-[#86868B]">People &amp; Payroll Operations</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-[#E5E5EA] dark:border-[#1C1C1E] text-center text-xs text-[#86868B]">
        <span>Argos HRMS Platform · Enterprise Attendance, Payroll &amp; Access Controls</span>
      </footer>
    </div>
  );
};
