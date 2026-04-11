'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Globe, Mail, Lock, User, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setError('Por favor ingresa una contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este correo ya está registrado. Intenta iniciar sesión.');
        } else {
          setError(authError.message);
        }
        return;
      }

      setRegistered(true);
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (registered) {
    return (
      <div className="mx-auto w-full max-w-md animate-fade-in">
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-indigo-500/5 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-4">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">
            ¡Cuenta creada!
          </h2>
          <p className="mb-6 text-sm text-zinc-400">
            Hemos enviado un correo de confirmación a{' '}
            <span className="font-medium text-zinc-300">{email}</span>. Revisa
            tu bandeja de entrada y haz clic en el enlace para activar tu
            cuenta.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110"
            >
              Ir a iniciar sesión
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => {
                setRegistered(false);
                setEmail('');
                setPassword('');
                setFullName('');
              }}
              className="w-full rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            >
              Registrar otra cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Únete a Sphere y potencia tu red profesional
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="full-name"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Nombre completo
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                autoComplete="name"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
              />
            </div>
          </div>

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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25"
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              Debe tener al menos 6 caracteres.
            </p>
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
                Crear cuenta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-500">o</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-zinc-400">
          ¿Ya tienes una cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-zinc-600">
        Al crear tu cuenta, aceptas nuestros términos de servicio y política de
        privacidad.
      </p>
    </div>
  );
}
