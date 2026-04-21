import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const GUARDRAILS = `
RESTRICCIONES ABSOLUTAS E INNEGOCIABLES:
Eres Sphere AI, un asistente especializado EXCLUSIVAMENTE en orientación laboral, coaching de empleabilidad, networking profesional y gestión de candidatos. Tu ámbito de actuación es estricto y no negociable.

SOLO puedes ayudar con:
- Preparar sesiones de orientación laboral con candidatos (personas en búsqueda de empleo)
- Técnicas de motivación y acompañamiento en procesos de búsqueda de empleo
- Estrategias de búsqueda de empleo, actualización de CV y LinkedIn
- Preparar candidatos para entrevistas de trabajo
- Redactar mensajes de seguimiento y comunicación con candidatos
- Detectar patrones de comportamiento en la búsqueda de empleo
- Sugerir recursos formativos, talleres y programas de empleabilidad
- Networking profesional y gestión de contactos del asesor
- Desarrollo de habilidades profesionales y gestión de carrera

DEBES NEGARTE SIEMPRE, sin excepciones, a:
- Cualquier tema no relacionado con orientación laboral o desarrollo profesional
- Consejo médico, psicológico clínico, legal o financiero profesional
- Contenido político, religioso o ideológico
- Ayudar a engañar, manipular o acosar a personas
- Generar contenido ofensivo, discriminatorio o dañino
- Phishing, spam o comunicaciones masivas no solicitadas
- Cualquier actividad ilegal o antiética

Si el usuario pregunta algo fuera del ámbito de la orientación laboral, responde educadamente:
"Solo puedo ayudarte con temas de orientación laboral, empleabilidad y networking profesional. Para esa consulta, te recomiendo acudir a un profesional especializado."

Responde siempre en español salvo que el usuario escriba en otro idioma, y sé conciso y práctico.`

function buildContactSystemPrompt(c: Record<string, unknown>, interactions: unknown[], tags: unknown[], outcomes: unknown[], workHistory: unknown[]): string {
  const contactSummary = [
    `Nombre: ${c.first_name} ${c.last_name || ''}`.trim(),
    c.job_title && `Cargo: ${c.job_title}`,
    c.company && `Empresa actual: ${c.company}`,
    c.city && `Ciudad: ${c.city}${c.country ? `, ${c.country}` : ''}`,
    `Tier de relación: ${c.tier} (${c.tier === 'S' ? 'Estratégico' : c.tier === 'A' ? 'Alta prioridad' : c.tier === 'B' ? 'Importante' : c.tier === 'C' ? 'Estándar' : 'Baja prioridad'})`,
    `Score de relación: ${c.relationship_score}/100`,
    `Frecuencia de seguimiento: ${c.follow_up_frequency}`,
    c.next_follow_up_date && `Próximo seguimiento: ${new Date(c.next_follow_up_date as string).toLocaleDateString('es-ES')}`,
    c.notes && `Notas: ${c.notes}`,
  ].filter(Boolean).join('\n')

  const positiveInterests = (tags as any[]).filter(t => t.is_positive).map(t => t.tags?.name).filter(Boolean)
  const negativeInterests = (tags as any[]).filter(t => !t.is_positive).map(t => t.tags?.name).filter(Boolean)
  const interestsSummary = [
    positiveInterests.length > 0 && `Le interesa: ${positiveInterests.join(', ')}`,
    negativeInterests.length > 0 && `No le interesa: ${negativeInterests.join(', ')}`,
  ].filter(Boolean).join('\n')

  const workSummary = (workHistory as any[]).length > 0
    ? 'Historial profesional:\n' + (workHistory as any[]).map(w =>
        `- ${w.job_title || 'Cargo no especificado'} en ${w.company}${w.start_date ? ` (${new Date(w.start_date).getFullYear()}${w.is_current ? ' → actualidad' : w.end_date ? ` → ${new Date(w.end_date).getFullYear()}` : ''})` : ''}`
      ).join('\n')
    : ''

  const interactionsSummary = (interactions as any[]).length > 0
    ? 'Historial de interacciones (más recientes primero):\n' + (interactions as any[]).slice(0, 10).map(i =>
        `- [${new Date(i.date).toLocaleDateString('es-ES')}] ${i.type}: "${i.title}" (${i.sentiment})${i.description ? ` — ${i.description}` : ''}${i.key_takeaways?.length > 0 ? `. Takeaways: ${i.key_takeaways.join('; ')}` : ''}`
      ).join('\n')
    : 'Sin interacciones registradas aún.'

  const outcomesSummary = (outcomes as any[]).length > 0
    ? 'Resultados obtenidos:\n' + (outcomes as any[]).map(o =>
        `- ${o.type}: "${o.title}"${o.description ? ` — ${o.description}` : ''}`
      ).join('\n')
    : ''

  return `Eres Sphere AI, el asistente inteligente de un asesor de orientación laboral. Tu rol es ayudar al asesor a preparar y gestionar mejor sus sesiones con cada candidato.

CANDIDATO EN CONTEXTO: ${c.first_name} ${c.last_name || ''}
${contactSummary}

${interestsSummary ? interestsSummary + '\n' : ''}${workSummary ? workSummary + '\n' : ''}${interactionsSummary}
${outcomesSummary ? outcomesSummary + '\n' : ''}
Ayuda al asesor a:
- Preparar la próxima sesión de orientación con este candidato concreto
- Sugerir estrategias de búsqueda de empleo personalizadas a su perfil
- Detectar posibles bloqueos o patrones negativos en su búsqueda
- Redactar mensajes de seguimiento y motivación para el candidato
- Recomendar recursos formativos o sectores afines a su experiencia
- Identificar fortalezas que el candidato puede no estar aprovechando

${GUARDRAILS}`
}

const GENERAL_SYSTEM_PROMPT = `Eres Sphere AI, el asistente inteligente de un asesor de orientación laboral. En este modo general (sin candidato específico), ayudas al asesor con técnicas, recursos y estrategias para hacer mejor su trabajo.

Puedes ayudar a:
- Diseñar talleres y sesiones grupales de empleabilidad
- Aprender técnicas de motivación y acompañamiento en búsqueda de empleo
- Preparar materiales didácticos: plantillas de CV, perfiles de LinkedIn, etc.
- Estrategias para diferentes perfiles (jóvenes sin experiencia, mayores de 45, cambio de sector)
- Preparar candidatos para entrevistas: STAR, por competencias, casos prácticos
- Técnicas de networking para candidatos: cómo acercarse a contactos, mensajes, etc.
- Detectar señales de desmotivación y cómo abordarlas
- Argumentarios y técnicas de orientación vocacional

${GUARDRAILS}`

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
    // Contact mode: load full context
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
    // General mode: no contact context
    systemPrompt = GENERAL_SYSTEM_PROMPT
    const prevRes = await supabase
      .from('ai_conversations')
      .select('role, content')
      .is('contact_id', null)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(40)
    prevMsgs = prevRes.data || []
  }

  // Build Gemini conversation
  const geminiContents = [
    ...prevMsgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message.trim() }] },
  ]

  const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ],
    }),
  })

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text()
    console.error('Gemini API error:', geminiRes.status, errBody)
    let detail = ''
    try {
      const parsed = JSON.parse(errBody)
      detail = parsed?.error?.message || parsed?.error?.status || ''
    } catch { detail = errBody.slice(0, 120) }
    return NextResponse.json(
      { error: `Error Sphere AI (${geminiRes.status})${detail ? ': ' + detail : ''}` },
      { status: 502 }
    )
  }

  const geminiData = await geminiRes.json()

  // Check for safety blocks
  const candidate = geminiData.candidates?.[0]
  if (candidate?.finishReason === 'SAFETY') {
    return NextResponse.json({ error: 'El contenido fue bloqueado por las políticas de seguridad. Por favor, reformula tu pregunta en el contexto del networking profesional.' }, { status: 422 })
  }

  const assistantText = candidate?.content?.parts?.[0]?.text
  if (!assistantText) {
    return NextResponse.json({ error: 'Respuesta vacía del asistente' }, { status: 502 })
  }

  // Persist conversation
  await supabase.from('ai_conversations').insert([
    { user_id: user.id, contact_id: contact_id || null, role: 'user', content: message.trim() },
    { user_id: user.id, contact_id: contact_id || null, role: 'assistant', content: assistantText },
  ])

  return NextResponse.json({ reply: assistantText })
}
