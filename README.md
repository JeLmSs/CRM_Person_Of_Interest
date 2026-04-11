# Sphere — Tu Red Profesional, Amplificada

CRM de networking inteligente para directivos y profesionales que quieren construir relaciones estratégicas.

## Funcionalidades

- **Gestión de contactos por Tiers (S/A/B/C/D)** — Prioriza tu red según nivel de interés
- **Seguimiento inteligente** — Configura frecuencia de contacto y recibe alertas de follow-ups
- **Timeline de relaciones** — Historial completo de interacciones con cada contacto
- **Registro de interacciones** — Reuniones, llamadas, cafés, eventos, LinkedIn, WhatsApp...
- **Intereses y temas** — Registra qué le interesa y qué no a cada contacto
- **Resultados medibles** — Registra oportunidades, presentaciones, consejos de cada relación
- **LinkedIn Intelligence** — Analiza perfiles y descubre conexiones potenciales
- **Calendario de seguimientos** — Vista mensual con follow-ups programados
- **Relationship Score** — Puntuación automática basada en frecuencia e interacciones
- **Multi-usuario** — Cada usuario ve solo sus contactos (Row Level Security)
- **Exportación CSV** — Exporta tus datos cuando quieras

## Tech Stack

- **Next.js 16** (App Router) — Desplegable en Vercel
- **Supabase** (Auth + PostgreSQL con RLS)
- **Tailwind CSS v4** (Dark theme profesional)
- **TypeScript**
- **Lucide Icons**

## Setup

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el SQL de `supabase/migrations/001_initial_schema.sql` en el SQL Editor de Supabase
3. Copia `.env.local.example` a `.env.local` y rellena con tus datos de Supabase
4. `npm install && npm run dev`

## Despliegue en Vercel

1. Conecta el repo a Vercel
2. Añade las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy
