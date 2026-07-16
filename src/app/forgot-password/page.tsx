"use client";

import React, { useState } from 'react';
import { Mail, Sparkles, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setResetToken('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send request.');
        setLoading(false);
        return;
      }

      setSuccess(data.message);
      if (data.token) {
        setResetToken(data.token);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100/50 p-8 relative overflow-hidden transition-all duration-300">
        
        {/* Sleek top brand accent line */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />
        
        {/* Header */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex p-2.5 bg-blue-50 rounded-xl mb-3 text-blue-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Forgot Password</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Reset your Eventelligence account password</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-250/70 rounded-xl text-rose-600 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {success ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-1">
                <p>{success}</p>
                <p className="text-[10px] text-emerald-600/80 font-medium">In local development, the reset link is printed on the server terminal logs.</p>
              </div>
            </div>

            {resetToken && (
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-2">
                <p className="text-xs font-bold text-blue-800">Local Development Bypass Link:</p>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline block break-all leading-relaxed"
                >
                  Click here to reset password directly
                </Link>
              </div>
            )}

            <Link
              href="/login"
              className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 bg-slate-50/30 focus:bg-white transition-all disabled:opacity-75"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-75 disabled:hover:bg-blue-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Link...</span>
                </>
              ) : (
                <span>Request Reset Link</span>
              )}
            </button>

            <Link
              href="/login"
              className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group mt-2"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Login</span>
            </Link>
          </form>
        )}

      </div>
    </div>
  );
}
