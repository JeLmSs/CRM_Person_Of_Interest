import { SupabaseClient } from '@supabase/supabase-js'

type EmbeddedTag = { name: string } | { name: string }[] | null
function tagName(t: EmbeddedTag): string | null {
  if (!t) return null
  if (Array.isArray(t)) return t[0]?.name ?? null
  return t.name ?? null
}

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
export const GEMINI_FLASH = 'gemini-2.5-flash'

export const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
]

export type Source = { uri: string; title: string }

type GeminiPart = { text?: string }
type GeminiCandidate = {
  content?: { parts?: GeminiPart[] }
  finishReason?: string
  groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] }
}

type GenOpts = {
  apiKey: string
  model?: string
  systemPrompt: string
  contents: { role: string; parts: { text: string }[] }[]
  tools?: Record<string, unknown>[]
  temperature?: number
  maxOutputTokens?: number
  maxContinuations?: number
}

export type GenResult =
  | { ok: true; text: string; sources: Source[]; continued: number }
  | { ok: false; status: number; error: string; safety?: boolean }

const CONTINUE_PROMPT = 'Continúa exactamente desde donde lo dejaste. No repitas nada de lo ya escrito, conecta con la última frase y mantén el mismo formato.'

export async function generateWithContinuation(opts: GenOpts): Promise<GenResult> {
  const model = opts.model ?? GEMINI_FLASH
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${opts.apiKey}`
  const maxRounds = 1 + (opts.maxContinuations ?? 2)
  let contents = opts.contents
  let fullText = ''
  const sourcesMap = new Map<string, Source>()
  let continued = 0
  let lastStatus = 0

  for (let round = 0; round < maxRounds; round++) {
    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: opts.systemPrompt }] },
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxOutputTokens ?? 4096,
      },
      safetySettings: SAFETY_SETTINGS,
    }
    if (opts.tools) body.tools = opts.tools

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    lastStatus = res.status

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Gemini error:', res.status, errBody)
      let detail = ''
      try { detail = JSON.parse(errBody)?.error?.message || '' } catch { detail = errBody.slice(0, 120) }
      return { ok: false, status: res.status, error: detail || `HTTP ${res.status}` }
    }

    const data = await res.json()
    const candidate = data.candidates?.[0] as GeminiCandidate | undefined

    if (candidate?.finishReason === 'SAFETY') {
      return { ok: false, status: 422, error: 'Contenido bloqueado por seguridad', safety: true }
    }

    const parts = candidate?.content?.parts || []
    const chunk = parts.map(p => p.text).filter(Boolean).join('')

    const gChunks = candidate?.groundingMetadata?.groundingChunks || []
    for (const gc of gChunks) {
      const web = gc.web
      if (web?.uri && !sourcesMap.has(web.uri)) {
        sourcesMap.set(web.uri, { uri: web.uri, title: web.title || web.uri })
      }
    }

    // Join with a space if previous chunk ended mid-sentence without whitespace
    if (fullText && chunk && !/\s$/.test(fullText) && !/^\s/.test(chunk)) {
      fullText += ' ' + chunk
    } else {
      fullText += chunk
    }

    if (candidate?.finishReason !== 'MAX_TOKENS') break
    if (round === maxRounds - 1) break

    continued += 1
    contents = [
      ...contents,
      { role: 'model', parts: [{ text: chunk }] },
      { role: 'user', parts: [{ text: CONTINUE_PROMPT }] },
    ]
  }

  if (!fullText.trim()) {
    return { ok: false, status: lastStatus || 502, error: 'Respuesta vacía del asistente' }
  }

  return {
    ok: true,
    text: fullText.trim(),
    sources: Array.from(sourcesMap.values()).slice(0, 8),
    continued,
  }
}

export const STYLE_GUIDE = `
ESTILO DE RESPUESTA:
- Responde en español, salvo que el usuario escriba en otro idioma.
- Sé directo, breve y accionable. Evita rodeos y disclaimers innecesarios.
- Cuando propongas mensajes o icebreakers, escríbelos listos para copiar (sin explicación previa larga).
- Usa listas cortas para opciones, no más de 5 puntos.
- Si te falta información clave, formula UNA sola pregunta concreta antes de responder.

LO QUE NO HACES:
- No das consejo médico, legal, financiero o psicológico clínico.
- No ayudas a manipular, acosar ni engañar a personas.
- No generas mensajes spam ni cadenas masivas.`

const tierLabel = (t: string) =>
  t === 'S' ? 'estratégico' : t === 'A' ? 'alta prioridad' : t === 'B' ? 'importante' : t === 'C' ? 'estándar' : 'baja prioridad'

export function buildContactSystemPrompt(
  c: Record<string, unknown>,
  interactions: any[],
  tags: any[],
  outcomes: any[],
  workHistory: any[],
): string {
  const fullName = `${c.first_name} ${c.last_name || ''}`.trim()
  const summary = [
    `Nombre: ${fullName}`,
    c.job_title && `Cargo: ${c.job_title}`,
    c.company && `Empresa: ${c.company}`,
    c.city && `Ubicación: ${c.city}${c.country ? `, ${c.country}` : ''}`,
    `Tier: ${c.tier} (${tierLabel(c.tier as string)})`,
    typeof c.relationship_score === 'number' && `Score de relación: ${c.relationship_score}/100`,
    c.follow_up_frequency && `Frecuencia de seguimiento: ${c.follow_up_frequency}`,
    c.next_follow_up_date && `Próximo seguimiento previsto: ${new Date(c.next_follow_up_date as string).toLocaleDateString('es-ES')}`,
    c.last_contact_date && `Último contacto: ${new Date(c.last_contact_date as string).toLocaleDateString('es-ES')}`,
    c.notes && `Notas del usuario: ${c.notes}`,
  ].filter(Boolean).join('\n')

  const positive = tags.filter(t => t.is_positive).map(t => tagName(t.tags)).filter((x): x is string => !!x)
  const negative = tags.filter(t => !t.is_positive).map(t => tagName(t.tags)).filter((x): x is string => !!x)
  const interests = [
    positive.length && `Le interesa: ${positive.join(', ')}`,
    negative.length && `Le desagrada / evitar: ${negative.join(', ')}`,
  ].filter(Boolean).join('\n')

  const work = workHistory.length
    ? 'Trayectoria:\n' + workHistory.map((w: any) =>
        `- ${w.job_title || 'Cargo no especificado'} en ${w.company}${w.start_date
          ? ` (${new Date(w.start_date).getFullYear()}${w.is_current
            ? ' → actualidad'
            : w.end_date ? ` → ${new Date(w.end_date).getFullYear()}` : ''})`
          : ''}`
      ).join('\n')
    : ''

  const inter = interactions.length
    ? 'Interacciones recientes (más nuevas primero):\n' + interactions.slice(0, 10).map((i: any) =>
        `- [${new Date(i.date).toLocaleDateString('es-ES')}] ${i.type} · ${i.sentiment} · "${i.title}"${
          i.description ? ` — ${i.description}` : ''
        }${i.key_takeaways?.length ? ` · takeaways: ${i.key_takeaways.join('; ')}` : ''}`
      ).join('\n')
    : 'Sin interacciones registradas aún.'

  const out = outcomes.length
    ? 'Resultados ya obtenidos con este contacto:\n' + outcomes.map((o: any) =>
        `- ${o.type}: "${o.title}"${o.description ? ` — ${o.description}` : ''}`
      ).join('\n')
    : ''

  return `Eres Sphere AI, el asistente personal del usuario para gestionar relaciones profesionales con sus contactos clave.

Tu rol NO es ayudar al contacto a buscar trabajo. Tu rol es ayudar AL USUARIO a preparar y mantener la relación con ${fullName}: anticipar encuentros, escribir mejor, elegir el momento, evitar errores y generar oportunidades.

CONTACTO ACTUAL: ${fullName}
${summary}

${interests ? interests + '\n' : ''}${work ? work + '\n' : ''}${inter}
${out ? out + '\n' : ''}
EN QUÉ AYUDAS AL USUARIO:
- Preparar el próximo encuentro o llamada (objetivo, temas, preguntas a hacer y a esperar).
- Sugerir icebreakers naturales basados en intereses, trayectoria o última conversación.
- Recomendar el mejor momento del día / día de la semana para escribirle (razona según cargo, sector y patrón de interacciones).
- Redactar mensajes listos para copiar (WhatsApp, LinkedIn, email) en el tono adecuado a la relación.
- Detectar señales de relación fría, oportunidades pendientes o follow-ups olvidados.
- Cuando una respuesta requiera datos públicos sobre la empresa o el cargo (noticias, movimientos, contexto de mercado), recuerda al usuario que puede activar el modo "Análisis avanzado" para que busques en la web.

${STYLE_GUIDE}`
}

export type GeneralCtx = {
  totalActive: number
  tierCounts: Record<string, number>
  staleCount: number
  pendingFollowUpsThisWeek: number
  recentInteractions30d: number
  topInterests: string[]
  topCompanies: string[]
  topRecentContacts: { name: string; company: string | null; tier: string; days_since: number | null }[]
}

export function buildGeneralSystemPrompt(ctx: GeneralCtx, userName: string | null): string {
  const tierLine = ['S','A','B','C','D'].map(t => `${t}:${ctx.tierCounts[t] || 0}`).join(' · ')
  const top = ctx.topRecentContacts.length
    ? 'Contactos con más actividad reciente:\n' + ctx.topRecentContacts.slice(0, 6).map(c =>
        `- ${c.name}${c.company ? ` (${c.company})` : ''} · tier ${c.tier}${c.days_since !== null ? ` · hace ${c.days_since}d` : ''}`
      ).join('\n')
    : ''

  return `Eres Sphere AI, el asistente personal del usuario${userName ? ` (${userName})` : ''} para gestionar su red de contactos profesionales.

Tu rol es ayudarle a mantener viva su red, decidir a quién contactar, cuándo y cómo. NO eres un orientador laboral para sus contactos: trabajas para el usuario.

ESTADO ACTUAL DE SU RED:
- Contactos activos: ${ctx.totalActive} (${tierLine})
- Seguimientos pendientes esta semana: ${ctx.pendingFollowUpsThisWeek}
- Contactos sin interacción >60 días: ${ctx.staleCount}
- Interacciones registradas últimos 30 días: ${ctx.recentInteractions30d}
${ctx.topInterests.length ? `- Intereses recurrentes en su red: ${ctx.topInterests.slice(0, 6).join(', ')}` : ''}
${ctx.topCompanies.length ? `- Empresas más representadas: ${ctx.topCompanies.slice(0, 6).join(', ')}` : ''}

${top}

EN QUÉ AYUDAS:
- Priorizar a quién escribir esta semana basándote en seguimientos pendientes, contactos fríos y tier.
- Proponer icebreakers genéricos o adaptados al perfil que el usuario describa.
- Aconsejar sobre el mejor momento (día, hora, canal) para enviar mensajes profesionales.
- Redactar plantillas de mensaje (WhatsApp, LinkedIn, email) en distintos tonos.
- Diseñar rutinas de mantenimiento de red y técnicas de networking.
- Si el usuario pide info externa sobre una empresa o sector, sugiérele activar el modo "Análisis avanzado" o seleccionar al contacto concreto.

${STYLE_GUIDE}`
}

export async function loadGeneralCtx(supabase: SupabaseClient, userId: string): Promise<GeneralCtx> {
  const since60 = new Date(Date.now() - 60 * 86_400_000).toISOString()
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const startWeek = new Date(); startWeek.setHours(0,0,0,0)
  const endWeek = new Date(startWeek.getTime() + 7 * 86_400_000).toISOString()

  const [contactsRes, interactionsRes, followUpsRes, tagsRes] = await Promise.all([
    supabase.from('contacts')
      .select('id, first_name, last_name, company, tier, status, last_contact_date')
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase.from('interactions')
      .select('contact_id, date')
      .eq('user_id', userId)
      .gte('date', since30)
      .order('date', { ascending: false }),
    supabase.from('follow_ups')
      .select('id, due_date, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('due_date', endWeek),
    supabase.from('contact_tags')
      .select('is_positive, tags(name)')
      .eq('is_positive', true),
  ])

  const contacts = contactsRes.data || []
  const interactions = interactionsRes.data || []
  const followUps = followUpsRes.data || []
  const tagRows = (tagsRes.data || []) as unknown as { tags: EmbeddedTag }[]

  const tierCounts: Record<string, number> = {}
  for (const c of contacts) tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1

  const staleCount = contacts.filter(c => !c.last_contact_date || c.last_contact_date < since60).length

  const interactionsByContact: Record<string, { count: number; latest: string }> = {}
  for (const i of interactions) {
    const cur = interactionsByContact[i.contact_id]
    if (!cur) interactionsByContact[i.contact_id] = { count: 1, latest: i.date }
    else { cur.count += 1; if (i.date > cur.latest) cur.latest = i.date }
  }

  const topRecentContacts = Object.entries(interactionsByContact)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([id, info]) => {
      const c = contacts.find(x => x.id === id)
      if (!c) return null
      const days = Math.floor((Date.now() - new Date(info.latest).getTime()) / 86_400_000)
      return { name: `${c.first_name} ${c.last_name || ''}`.trim(), company: c.company, tier: c.tier, days_since: days }
    })
    .filter(Boolean) as GeneralCtx['topRecentContacts']

  const companyCount: Record<string, number> = {}
  for (const c of contacts) if (c.company) companyCount[c.company] = (companyCount[c.company] || 0) + 1
  const topCompanies = Object.entries(companyCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)

  const interestCount: Record<string, number> = {}
  for (const t of tagRows) {
    const name = tagName(t.tags)
    if (name) interestCount[name] = (interestCount[name] || 0) + 1
  }
  const topInterests = Object.entries(interestCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)

  return {
    totalActive: contacts.length,
    tierCounts,
    staleCount,
    pendingFollowUpsThisWeek: followUps.length,
    recentInteractions30d: interactions.length,
    topInterests,
    topCompanies,
    topRecentContacts,
  }
}
