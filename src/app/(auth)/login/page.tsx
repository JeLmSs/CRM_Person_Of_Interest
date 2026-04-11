'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Globe, Mail, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          setError('Credenciales inválidas. Verifica tu correo y contraseña.');
        } else if (authError.message === 'Email not confirmed') {
          setError('Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.');
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }

    setMagicLinkLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess('¡Enlace mágico enviado! Revisa tu bandeja de entrada.');
    } catch {
      setError('Ocurrió un error al enviar el enlace. Intenta de nuevo.');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md animate-fade-in">
      {/* Card */}
      <div className="glass rounded-2xl p-8 shadow-2xl shadow-indigo-500/5">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 p-3 shadow-lg shadow-indigo-500/25">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Sphere
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Tu red profesional, amplificada
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex rounded-xl bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              mode === 'password'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Contraseña
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('magic');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              mode === 'magic'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Enlace mágico
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Password Form */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@ejemplo.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Magic Link Form */}
        {mode === 'magic' && (
          <form onSubmit={handleMagicLink} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="magic-email"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="magic-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@ejemplo.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Te enviaremos un enlace a tu correo para iniciar sesión sin contraseña.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={magicLinkLoading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {magicLinkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Enviar enlace mágico
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-500">o</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Register Link */}
        <p className="text-center text-sm text-zinc-400">
          ¿No tienes una cuenta?{' '}
          <Link
            href="/register"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Crear cuenta
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-zinc-600">
        Al continuar, aceptas nuestros términos de servicio y política de privacidad.
      </p>
    </div>
  );
}
