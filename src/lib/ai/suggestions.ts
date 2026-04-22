type ContactRow = {
  first_name: string
  last_name: string | null
  job_title: string | null
  company: string | null
  next_follow_up_date: string | null
  last_contact_date: string | null
  tier: string
}

type InteractionRow = {
  date: string
  title: string | null
  sentiment: string | null
}

type ContactTagRow = {
  is_positive: boolean
  tags: { name: string } | null
}

const DAY = 86_400_000

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / DAY)
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.floor(ms / DAY)
}

export function buildContactSuggestions(
  contact: ContactRow,
  interactions: InteractionRow[],
  tags: ContactTagRow[],
): string[] {
  const out: string[] = []
  const name = contact.first_name
  const last = interactions[0]
  const since = daysSince(last?.date ?? contact.last_contact_date)
  const until = daysUntil(contact.next_follow_up_date)
  const positive = tags.filter(t => t.is_positive).map(t => t.tags?.name).filter(Boolean)
  const negSentiment = last?.sentiment === 'negative' || last?.sentiment === 'very_negative'

  if (until !== null && until >= 0 && until <= 7) {
    out.push(`Prepárame el próximo encuentro con ${name}: objetivo, temas y preguntas`)
  } else if (since === null) {
    out.push(`Sugiéreme un primer mensaje para presentarme a ${name}`)
  } else if (since >= 60) {
    out.push(`Dame un mensaje para retomar el contacto tras ${since} días sin hablar`)
  } else {
    out.push(`Prepárame la próxima conversación con ${name}`)
  }

  if (positive.length > 0) {
    const sample = positive.slice(0, 2).join(' y ')
    out.push(`3 icebreakers apoyándome en su interés por ${sample}`)
  } else {
    out.push(`3 icebreakers que encajen con su perfil profesional`)
  }

  out.push(`¿Cuál es el mejor momento del día para escribirle?`)

  if (negSentiment) {
    out.push('La última interacción fue tensa, ¿cómo recompongo la relación?')
  } else if (last?.title) {
    out.push(`Mensaje breve de seguimiento sobre "${last.title}"`)
  } else if (contact.company) {
    out.push(`¿Qué temas de su empresa puedo usar para conectar?`)
  } else {
    out.push('Detecta señales fuertes y débiles de su perfil')
  }

  return out.slice(0, 4)
}

type GeneralStats = {
  totalActive: number
  tierCounts: Record<string, number>
  staleCount: number
  pendingFollowUpsThisWeek: number
  recentInteractions30d: number
  topInterests: string[]
  topCompanies: string[]
}

export function buildGeneralSuggestions(s: GeneralStats): string[] {
  const out: string[] = []

  if (s.pendingFollowUpsThisWeek > 0) {
    out.push(`Tengo ${s.pendingFollowUpsThisWeek} seguimientos esta semana, ayúdame a priorizar`)
  } else {
    out.push('¿A qué contactos debería dar prioridad esta semana?')
  }

  if (s.staleCount >= 3) {
    out.push(`Hay ${s.staleCount} contactos sin actividad >60 días, ¿por dónde empiezo?`)
  } else {
    out.push('Dame 5 frases para romper el hielo con un contacto nuevo')
  }

  out.push('¿Cuál es el mejor momento del día para mandar mensajes profesionales?')

  if (s.topInterests.length > 0) {
    out.push(`Plantéame temas para abrir conversación sobre ${s.topInterests[0]}`)
  } else if ((s.tierCounts['S'] || 0) + (s.tierCounts['A'] || 0) > 0) {
    out.push('Plantilla de mensaje para reconectar con un contacto top tier')
  } else {
    out.push('Plantilla de mensaje para hacer follow-up tras una primera reunión')
  }

  return out.slice(0, 4)
}

export type { GeneralStats }
