'use client'

import Link from 'next/link'
import {
  Globe,
  Users,
  Bell,
  Clock,
  ExternalLink,
  BarChart3,
  UsersRound,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: Target,
    title: 'Contactos por Tiers',
    description: 'Prioriza tu red con niveles S, A, B, C, D. Enfoca tu energía en las relaciones que más importan.',
  },
  {
    icon: Bell,
    title: 'Seguimiento Inteligente',
    description: 'Nunca pierdas el contacto. Recordatorios automáticos personalizados para cada persona.',
  },
  {
    icon: Clock,
    title: 'Timeline de Relaciones',
    description: 'Historial completo de cada interacción, reunión, llamada y resultado.',
  },
  {
    icon: ExternalLink,
    title: 'LinkedIn Intelligence',
    description: 'Analiza perfiles, extrae intereses y descubre conexiones estratégicas.',
  },
  {
    icon: BarChart3,
    title: 'Resultados Medibles',
    description: 'Registra qué oportunidades, presentaciones y colaboraciones surgen de cada relación.',
  },
  {
    icon: UsersRound,
    title: 'Multi-usuario',
    description: 'Comparte la plataforma con tu equipo. Cada uno gestiona su propia red.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Añade tus contactos',
    description: 'Importa o añade manualmente las personas clave de tu red profesional.',
  },
  {
    number: '02',
    title: 'Registra interacciones',
    description: 'Cada café, llamada o reunión queda registrada con notas y resultados.',
  },
  {
    number: '03',
    title: 'Cultiva relaciones',
    description: 'Los seguimientos inteligentes te ayudan a mantener tu red siempre activa.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-semibold">Sphere</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            CRM de Networking Inteligente
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Tu red profesional,{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              amplificada
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            El CRM diseñado para directivos y profesionales que entienden que las
            relaciones estratégicas son la clave del éxito. Gestiona, cultiva y
            potencia tu networking como nunca antes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              Empezar gratis
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-3.5 border border-zinc-700 hover:border-zinc-600 rounded-xl text-base font-medium text-zinc-300 hover:text-white transition-all duration-300"
            >
              Iniciar sesión
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mt-16 text-center">
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-sm text-zinc-500">Gratuito</div>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <div className="text-2xl font-bold text-white">Multi-usuario</div>
              <div className="text-sm text-zinc-500">Cada uno su red</div>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div>
              <div className="text-2xl font-bold text-white">Vercel</div>
              <div className="text-sm text-zinc-500">Deploy instant</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para{' '}
              <span className="text-indigo-400">dominar tu red</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Funcionalidades diseñadas específicamente para profesionales que
              hacen networking estratégico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group p-6 bg-[#0f0f14] border border-zinc-800/50 rounded-xl hover:border-indigo-500/30 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Así de <span className="text-violet-400">simple</span>
            </h2>
            <p className="text-zinc-400 text-lg">
              Tres pasos para transformar tu forma de hacer networking.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="flex items-start gap-6 p-6 bg-[#0f0f14] border border-zinc-800/50 rounded-xl"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-lg font-bold">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                  <p className="text-zinc-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 rounded-2xl">
            <Zap className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">
              Empieza a construir relaciones estratégicas
            </h2>
            <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
              Regístrate gratis y comienza a gestionar tu red profesional con la
              herramienta más inteligente del mercado.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg shadow-indigo-500/20"
            >
              Crear cuenta gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">Sphere</span>
          </div>
          <p className="text-sm text-zinc-500">
            Hecho para networkers ambiciosos &middot; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
