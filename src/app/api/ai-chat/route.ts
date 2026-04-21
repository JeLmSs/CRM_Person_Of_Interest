import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI no configurado' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { contact_id, message } = await req.json()
  if (!contact_id || !message?.trim()) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  // Load full contact context
  const [contactRes, interactionsRes, tagsRes, outcomesRes, historyRes, prevMsgsRes] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', contact_id).eq('user_id', user.id).single(),
    supabase.from('interactions').select('*').eq('contact_id', contact_id).order('date', { ascending: false }).limit(20),
    supabase.from('contact_tags').select('*, tags(name, category)').eq('contact_id', contact_id),
    supabase.from('outcomes').select('*').eq('contact_id', contact_id).order('created_at', { ascending: false }).limit(10),
    supabase.from('work_history').select('*').eq('contact_id', contact_id).order('created_at', { ascending: false }),
    supabase.from('ai_conversations').select('*').eq('contact_id', contact_id).eq('user_id', user.id).order('created_at', { ascending: true }).limit(40),
  ])

  if (!contactRes.data) {
    return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })
  }

  const c = contactRes.data
  const interactions = interactionsRes.data || []
  const tags = tagsRes.data || []
  const outcomes = outcomesRes.data || []
  const workHistory = historyRes.data || []
  const prevMsgs = prevMsgsRes.data || []

  // Build system prompt with full contact context
  const contactSummary = [
    `Nombre: ${c.first_name} ${c.last_name || ''}`.trim(),
    c.job_title && `Cargo: ${c.job_title}`,
    c.company && `Empresa actual: ${c.company}`,
    c.city && `Ciudad: ${c.city}${c.country ? `, ${c.country}` : ''}`,
    c.email && `Email: ${c.email}`,
    c.phone && `Teléfono: ${c.phone}`,
    c.linkedin_url && `LinkedIn: ${c.linkedin_url}`,
    `Tier de relación: ${c.tier} (${c.tier === 'S' ? 'Estratégico' : c.tier === 'A' ? 'Alta prioridad' : c.tier === 'B' ? 'Importante' : c.tier === 'C' ? 'Estándar' : 'Baja prioridad'})`,
    `Score de relación: ${c.relationship_score}/100`,
    `Frecuencia de seguimiento: ${c.follow_up_frequency}`,
    c.next_follow_up_date && `Próximo seguimiento: ${new Date(c.next_follow_up_date).toLocaleDateString('es-ES')}`,
    c.notes && `Notas: ${c.notes}`,
  ].filter(Boolean).join('\n')

  const positiveInterests = tags.filter((t: any) => t.is_positive).map((t: any) => t.tags?.name).filter(Boolean)
  const negativeInterests = tags.filter((t: any) => !t.is_positive).map((t: any) => t.tags?.name).filter(Boolean)
  const interestsSummary = [
    positiveInterests.length > 0 && `Le interesa: ${positiveInterests.join(', ')}`,
    negativeInterests.length > 0 && `No le interesa: ${negativeInterests.join(', ')}`,
  ].filter(Boolean).join('\n')

  const workSummary = workHistory.length > 0
    ? 'Historial profesional:\n' + workHistory.map((w: any) =>
        `- ${w.job_title || 'Cargo no especificado'} en ${w.company}${w.start_date ? ` (${w.start_date}${w.end_date ? ` → ${w.end_date}` : w.is_current ? ' → actualidad' : ''})` : ''}`
      ).join('\n')
    : ''

  const interactionsSummary = interactions.length > 0
    ? 'Historial de interacciones (más recientes primero):\n' + interactions.slice(0, 10).map((i: any) =>
        `- [${new Date(i.date).toLocaleDateString('es-ES')}] ${i.type}: "${i.title}" (${i.sentiment})${i.description ? ` — ${i.description}` : ''}${i.key_takeaways?.length > 0 ? `. Takeaways: ${i.key_takeaways.join('; ')}` : ''}`
      ).join('\n')
    : 'Sin interacciones registradas aún.'

  const outcomesSummary = outcomes.length > 0
    ? 'Resultados obtenidos:\n' + outcomes.map((o: any) =>
        `- ${o.type}: "${o.title}"${o.description ? ` — ${o.description}` : ''}`
      ).join('\n')
    : ''

  const systemPrompt = `Eres un asistente experto en networking profesional y gestión de relaciones. Ayudas al usuario a preparar y mejorar sus interacciones con sus contactos profesionales.

CONTACTO: ${c.first_name} ${c.last_name || ''}
${contactSummary}

${interestsSummary ? interestsSummary + '\n' : ''}${workSummary ? workSummary + '\n' : ''}${interactionsSummary}
${outcomesSummary ? outcomesSummary + '\n' : ''}
Basándote en toda esta información, ayuda al usuario a:
- Preparar conversaciones y reuniones con este contacto
- Sugerir temas de conversación relevantes basados en sus intereses
- Analizar el estado de la relación y cómo mejorarla
- Redactar mensajes o emails personalizados
- Identificar oportunidades de colaboración o apoyo mutuo

Responde siempre en español, de forma concisa y práctica. Usa el contexto del contacto para personalizar tus respuestas.`

  // Build conversation history for Gemini (alternating user/model turns)
  const geminiContents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  for (const msg of prevMsgs) {
    geminiContents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })
  }
  geminiContents.push({ role: 'user', parts: [{ text: message }] })

  const geminiPayload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: geminiContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  }

  const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiPayload),
  })

  if (!geminiRes.ok) {
    const err = await geminiRes.text()
    console.error('Gemini API error:', err)
    return NextResponse.json({ error: 'Error al contactar con la IA' }, { status: 502 })
  }

  const geminiData = await geminiRes.json()
  const assistantText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!assistantText) {
    return NextResponse.json({ error: 'Respuesta vacía de la IA' }, { status: 502 })
  }

  // Save both messages to DB
  await supabase.from('ai_conversations').insert([
    { user_id: user.id, contact_id, role: 'user', content: message },
    { user_id: user.id, contact_id, role: 'assistant', content: assistantText },
  ])

  return NextResponse.json({ reply: assistantText })
}
