import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  buildContactSystemPrompt,
  buildGeneralSystemPrompt,
  loadGeneralCtx,
  generateWithContinuation,
} from '@/lib/ai/chat-context'

export const maxDuration = 45

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Asistente IA no configurado. Añade GEMINI_API_KEY en Vercel.' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { contact_id, message } = body as { contact_id?: string | null; message: string }

  if (!message?.trim() || message.trim().length > 4000) {
    return NextResponse.json({ error: 'Mensaje inválido o demasiado largo' }, { status: 400 })
  }

  let systemPrompt: string
  let prevMsgs: { role: string; content: string }[] = []

  if (contact_id) {
    const [contactRes, interactionsRes, tagsRes, outcomesRes, historyRes, prevMsgsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', contact_id).eq('user_id', user.id).single(),
      supabase.from('interactions').select('*').eq('contact_id', contact_id).order('date', { ascending: false }).limit(20),
      supabase.from('contact_tags').select('*, tags(name, category)').eq('contact_id', contact_id),
      supabase.from('outcomes').select('*').eq('contact_id', contact_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('work_history').select('*').eq('contact_id', contact_id).order('created_at', { ascending: false }),
      supabase.from('ai_conversations').select('role, content').eq('contact_id', contact_id).eq('user_id', user.id).order('created_at', { ascending: true }).limit(40),
    ])

    if (!contactRes.data) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })
    }

    systemPrompt = buildContactSystemPrompt(
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
        .limit(40),
    ])
    systemPrompt = buildGeneralSystemPrompt(ctx, profileRes.data?.full_name ?? null)
    prevMsgs = prevRes.data || []
  }

  const geminiContents = [
    ...prevMsgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message.trim() }] },
  ]

  const result = await generateWithContinuation({
    apiKey,
    systemPrompt,
    contents: geminiContents,
    temperature: 0.7,
    maxOutputTokens: 4096,
  })

  if (!result.ok) {
    if (result.safety) {
      return NextResponse.json({ error: 'Tu petición fue bloqueada por las políticas de seguridad. Reformúlala con otro enfoque.' }, { status: 422 })
    }
    if (result.status === 429) {
      return NextResponse.json({ error: 'Sphere AI ha alcanzado el límite de uso. Contacta con el administrador para activar el plan.' }, { status: 429 })
    }
    if (result.status === 401 || result.status === 403) {
      return NextResponse.json({ error: 'Sphere AI no está configurado correctamente. Verifica la API key en Vercel.' }, { status: 502 })
    }
    return NextResponse.json({ error: `Error Sphere AI (${result.status})${result.error ? ': ' + result.error : ''}` }, { status: 502 })
  }

  await supabase.from('ai_conversations').insert([
    { user_id: user.id, contact_id: contact_id || null, role: 'user', content: message.trim() },
    { user_id: user.id, contact_id: contact_id || null, role: 'assistant', content: result.text },
  ])

  return NextResponse.json({ reply: result.text })
}
