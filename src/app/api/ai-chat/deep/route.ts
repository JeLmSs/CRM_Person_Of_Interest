import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  GEMINI_BASE,
  GEMINI_FLASH,
  SAFETY_SETTINGS,
  STYLE_GUIDE,
  buildContactSystemPrompt,
  buildGeneralSystemPrompt,
  loadGeneralCtx,
} from '@/lib/ai/chat-context'

export const maxDuration = 60

const DEEP_INSTRUCTIONS = `
ESTÁS EN MODO ANÁLISIS AVANZADO.
Tienes acceso a búsqueda web en tiempo real (Google Search). Úsala para enriquecer tu respuesta con:
- Información reciente de la empresa del contacto (noticias, movimientos, cambios de cargo, financiación, lanzamientos).
- Tendencias del sector o tecnología en la que trabaja.
- Eventos profesionales próximos relevantes.
- Cualquier dato público que ayude al usuario a preparar mejor el encuentro.

Combina lo que encuentres en la web con la información del CRM del usuario. Cita las fuentes que uses como una lista breve al final bajo el título "Fuentes:".
Si la búsqueda no aporta nada útil, dilo abiertamente y responde solo con la info del CRM.
${STYLE_GUIDE}`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Asistente IA no configurado.' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { contact_id, message } = body as { contact_id?: string | null; message: string }

  if (!message?.trim() || message.trim().length > 4000) {
    return NextResponse.json({ error: 'Mensaje inválido o demasiado largo' }, { status: 400 })
  }

  let baseSystemPrompt: string
  let prevMsgs: { role: string; content: string }[] = []

  if (contact_id) {
    const [contactRes, interactionsRes, tagsRes, outcomesRes, historyRes, prevMsgsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', contact_id).eq('user_id', user.id).single(),
      supabase.from('interactions').select('*').eq('contact_id', contact_id).order('date', { ascending: false }).limit(20),
      supabase.from('contact_tags').select('*, tags(name, category)').eq('contact_id', contact_id),
      supabase.from('outcomes').select('*').eq('contact_id', contact_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('work_history').select('*').eq('contact_id', contact_id).order('created_at', { ascending: false }),
      supabase.from('ai_conversations').select('role, content').eq('contact_id', contact_id).eq('user_id', user.id).order('created_at', { ascending: true }).limit(20),
    ])

    if (!contactRes.data) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })

    baseSystemPrompt = buildContactSystemPrompt(
      contactRes.data as Record<string, unknown>,
      interactionsRes.data || [],
      tagsRes.data || [],
      outcomesRes.data || [],
      historyRes.data || [],
    )
    prevMsgs = prevMsgsRes.data || []
  } else {
    const [ctx, profileRes, prevRes] = await Promise.all([
      loadGeneralCtx(supabase, user.id),
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('ai_conversations')
        .select('role, content')
        .is('contact_id', null)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20),
    ])
    baseSystemPrompt = buildGeneralSystemPrompt(ctx, profileRes.data?.full_name ?? null)
    prevMsgs = prevRes.data || []
  }

  const systemPrompt = `${baseSystemPrompt}\n\n${DEEP_INSTRUCTIONS}`

  const geminiContents = [
    ...prevMsgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message.trim() }] },
  ]

  const geminiRes = await fetch(`${GEMINI_BASE}/${GEMINI_FLASH}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents,
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
      safetySettings: SAFETY_SETTINGS,
    }),
  })

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text()
    console.error('Gemini deep API error:', geminiRes.status, errBody)
    if (geminiRes.status === 429) {
      return NextResponse.json({ error: 'Límite de análisis avanzado alcanzado. Inténtalo más tarde.' }, { status: 429 })
    }
    let detail = ''
    try { detail = JSON.parse(errBody)?.error?.message || '' } catch { detail = errBody.slice(0, 120) }
    return NextResponse.json({ error: `Error análisis avanzado (${geminiRes.status})${detail ? ': ' + detail : ''}` }, { status: 502 })
  }

  const geminiData = await geminiRes.json()
  const candidate = geminiData.candidates?.[0]

  if (candidate?.finishReason === 'SAFETY') {
    return NextResponse.json({ error: 'La respuesta fue bloqueada por seguridad. Reformula la petición.' }, { status: 422 })
  }

  const parts = candidate?.content?.parts || []
  const assistantText = parts.map((p: { text?: string }) => p.text).filter(Boolean).join('\n').trim()
  if (!assistantText) {
    return NextResponse.json({ error: 'Respuesta vacía del asistente' }, { status: 502 })
  }

  type GroundingChunk = { web?: { uri?: string; title?: string } }
  const chunks: GroundingChunk[] = candidate?.groundingMetadata?.groundingChunks || []
  const sources = chunks
    .map(c => c.web)
    .filter((w): w is { uri: string; title?: string } => !!w?.uri)
    .map(w => ({ uri: w.uri, title: w.title || w.uri }))
    .slice(0, 8)

  const finalContent = sources.length
    ? assistantText + '\n\n__SOURCES__' + JSON.stringify(sources)
    : assistantText

  await supabase.from('ai_conversations').insert([
    { user_id: user.id, contact_id: contact_id || null, role: 'user', content: '🔎 ' + message.trim() },
    { user_id: user.id, contact_id: contact_id || null, role: 'assistant', content: finalContent },
  ])

  return NextResponse.json({ reply: assistantText, sources })
}
