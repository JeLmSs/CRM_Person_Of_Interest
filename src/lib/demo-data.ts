import { Contact, Interaction, FollowUp, Tag, Outcome, ConversationTopic, ContactTier, InteractionType, InteractionSentiment, FollowUpStatus, TagCategory, OutcomeType } from './types/database'

// Seeded pseudo-random number generator for deterministic but varied data
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function seededChoice<T>(seed: number, index: number, array: T[]): T {
  return array[Math.floor(seededRandom(seed, index) * array.length)]
}

function seededShuffled<T>(seed: number, array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

const firstNames = ['Marco', 'Elena', 'Diego', 'Sofía', 'Carlos', 'María', 'Antonio', 'Lucia', 'Miguel', 'Isabella', 'José', 'Ana']
const lastNames = ['García', 'López', 'Martínez', 'González', 'Rodríguez', 'Fernández', 'Torres', 'Ramírez', 'Pérez', 'Sánchez']
const companies = ['TechCorp', 'InnovateLabs', 'GlobalSolutions', 'CloudWorks', 'DataDrive', 'NexGen', 'Vertex Inc', 'Quantum Systems', 'Digital Hub', 'FutureScale']
const cities = ['Madrid', 'Barcelona', 'Valencia', 'Bilbao', 'Sevilla', 'Zaragoza', 'Mallorca', 'Córdoba']
const industries = ['Technology', 'Finance', 'Healthcare', 'Consulting', 'Manufacturing', 'Retail', 'Education', 'Energy']

const interactionTitles = [
  'Reunión estratégica trimestral',
  'Llamada de seguimiento',
  'Café en la Castellana',
  'Email con propuesta',
  'Almuerzo de networking',
  'Evento de la industria',
  'Mensaje en LinkedIn',
  'Mensaje por WhatsApp',
  'Demos producto',
  'Reunión de negociación',
  'Consulta técnica',
  'Check-in informal'
]

const followUpTopics = [
  'Compartir artículo relevante',
  'Seguimiento de propuesta',
  'Introducción a contacto clave',
  'Validar feedback recibido',
  'Planificar próxima reunión',
  'Enviar documentación',
  'Confirmación de acuerdo',
  'Revisar presentación'
]

const tags = [
  { name: 'Estratégico', category: 'interest' as TagCategory },
  { name: 'Tecnología', category: 'industry' as TagCategory },
  { name: 'Leadership', category: 'skill' as TagCategory },
  { name: 'Finanzas', category: 'interest' as TagCategory },
  { name: 'Marketing', category: 'skill' as TagCategory },
  { name: 'Sostenibilidad', category: 'topic' as TagCategory },
  { name: 'Innovación', category: 'interest' as TagCategory },
  { name: 'Negociación', category: 'skill' as TagCategory }
]

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

export function generateDemoContacts(seed: number, userId: string): Contact[] {
  const tiers: ContactTier[] = ['S', 'A', 'B', 'C', 'D']
  const contacts: Contact[] = []
  let contactIndex = 0

  for (let tier of tiers) {
    const count = tier === 'S' || tier === 'C' || tier === 'D' ? 2 : 3
    for (let i = 0; i < count; i++) {
      const firstIdx = contactIndex % firstNames.length
      const lastIdx = Math.floor(contactIndex / firstNames.length) % lastNames.length
      const companyIdx = contactIndex % companies.length

      contacts.push({
        id: `demo-contact-${contactIndex}`,
        user_id: userId,
        first_name: firstNames[firstIdx],
        last_name: lastNames[lastIdx],
        email: `${firstNames[firstIdx].toLowerCase()}.${lastNames[lastIdx].toLowerCase()}@example.com`,
        phone: `+34 91 ${Math.floor(contactIndex * 111111 % 999999)}`,
        company: companies[companyIdx],
        job_title: seededChoice(seed, contactIndex, ['CEO', 'Director', 'Manager', 'Specialist', 'Consultant', 'VP']),
        linkedin_url: `https://linkedin.com/in/${firstNames[firstIdx].toLowerCase()}-${lastNames[lastIdx].toLowerCase()}`,
        linkedin_profile_data: null,
        avatar_url: null,
        tier,
        status: tier === 'S' ? 'active' : seededChoice(seed, contactIndex * 10, ['active', 'dormant']),
        follow_up_frequency: seededChoice(seed, contactIndex * 20, ['daily', 'weekly', 'biweekly', 'monthly']),
        custom_follow_up_days: null,
        last_contact_date: formatDate(addDays(new Date(), -Math.floor(seededRandom(seed, contactIndex) * 30))),
        next_follow_up_date: formatDate(addDays(new Date(), Math.floor(seededRandom(seed, contactIndex + 100) * 20))),
        relationship_score: Math.floor(30 + seededRandom(seed, contactIndex) * 70),
        city: seededChoice(seed, contactIndex, cities),
        country: 'Spain',
        referred_by: seededRandom(seed, contactIndex + 200) > 0.7 ? seededChoice(seed, contactIndex, firstNames) : null,
        notes: `${seededChoice(seed, contactIndex, ['Clave para', 'Interesado en', 'Contacto de', 'Especialista en', 'Referencia en'])} ${seededChoice(seed, contactIndex * 3, industries)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      contactIndex++
    }
  }

  return contacts
}

export function generateDemoInteractions(seed: number, userId: string, contacts: Contact[]): Interaction[] {
  const interactions: Interaction[] = []
  const types: InteractionType[] = ['meeting', 'call', 'email', 'coffee', 'lunch', 'event', 'linkedin', 'whatsapp', 'other']
  const sentiments: InteractionSentiment[] = ['very_positive', 'positive', 'neutral', 'negative']

  for (let i = 0; i < 35; i++) {
    const contact = seededChoice(seed, i, contacts)
    const baseDate = new Date()
    const dayOffset = Math.floor(seededRandom(seed, i * 10) * 120) - 60 // -60 to +60 days
    const interactionDate = addDays(baseDate, dayOffset)
    const hour = Math.floor(seededRandom(seed, i * 11) * 14) + 8 // 8am to 10pm
    const minute = Math.floor(seededRandom(seed, i * 12) * 60)

    interactions.push({
      id: `demo-interaction-${i}`,
      user_id: userId,
      contact_id: contact.id,
      type: seededChoice(seed, i, types),
      title: seededChoice(seed, i, interactionTitles),
      description: seededRandom(seed, i * 5) > 0.5 ? `Conversación productiva sobre ${seededChoice(seed, i, industries).toLowerCase()}` : null,
      sentiment: seededChoice(seed, i, sentiments),
      date: formatDate(interactionDate),
      duration_minutes: seededChoice(seed, i, [30, 45, 60, 90, 120]),
      location: seededRandom(seed, i * 6) > 0.3 ? seededChoice(seed, i, cities) : null,
      key_takeaways: seededRandom(seed, i * 7) > 0.6 ? ['Punto 1', 'Punto 2'] : null,
      action_items: seededRandom(seed, i * 8) > 0.6 ? ['Acción 1', 'Acción 2'] : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  return interactions
}

export function generateDemoFollowUps(seed: number, userId: string, contacts: Contact[]): FollowUp[] {
  const followUps: FollowUp[] = []
  const statuses: FollowUpStatus[] = ['pending', 'completed', 'overdue', 'skipped']

  for (let i = 0; i < 15; i++) {
    const contact = seededChoice(seed, i + 100, contacts)
    const daysFromNow = Math.floor(seededRandom(seed, i * 15) * 40) - 10
    const dueDate = addDays(new Date(), daysFromNow)
    const status = seededChoice(seed, i, statuses)

    followUps.push({
      id: `demo-followup-${i}`,
      user_id: userId,
      contact_id: contact.id,
      due_date: formatDate(dueDate),
      status,
      suggested_topics: seededRandom(seed, i * 20) > 0.5 ? [seededChoice(seed, i, followUpTopics)] : null,
      notes: seededRandom(seed, i * 21) > 0.4 ? `Recordatorio: ${seededChoice(seed, i, ['Llamar', 'Enviar email', 'Reunión', 'Seguimiento'])}` : null,
      completed_at: status === 'completed' ? formatDate(addDays(dueDate, Math.floor(seededRandom(seed, i * 22) * 5))) : null,
      created_at: new Date().toISOString()
    })
  }

  return followUps
}

export function generateDemoTags(seed: number, userId: string): Tag[] {
  return tags.map((tag, idx) => ({
    id: `demo-tag-${idx}`,
    user_id: userId,
    name: tag.name,
    category: tag.category,
    color: colors[idx % colors.length],
    created_at: new Date().toISOString()
  }))
}

export function generateDemoOutcomes(seed: number, userId: string, contacts: Contact[]): Outcome[] {
  const outcomes: Outcome[] = []
  const types: OutcomeType[] = ['job_lead', 'introduction', 'advice', 'collaboration', 'referral']

  for (let i = 0; i < 10; i++) {
    const contact = seededChoice(seed, i + 200, contacts)

    outcomes.push({
      id: `demo-outcome-${i}`,
      user_id: userId,
      contact_id: contact.id,
      interaction_id: seededRandom(seed, i * 30) > 0.5 ? `demo-interaction-${i}` : null,
      type: seededChoice(seed, i, types),
      title: `${seededChoice(seed, i, types)} de ${contact.first_name}`,
      description: seededRandom(seed, i * 31) > 0.4 ? 'Resultado positivo de la relación' : null,
      value_rating: seededRandom(seed, i * 32) > 0.5 ? Math.floor(seededRandom(seed, i * 33) * 5) + 1 : null,
      created_at: new Date().toISOString()
    })
  }

  return outcomes
}

export function generateDemoTopics(seed: number, userId: string, contacts: Contact[]): ConversationTopic[] {
  const topics: ConversationTopic[] = []

  contacts.forEach((contact, idx) => {
    const count = Math.floor(seededRandom(seed, idx * 40) * 3) + 1
    for (let i = 0; i < count; i++) {
      topics.push({
        id: `demo-topic-${idx}-${i}`,
        user_id: userId,
        contact_id: contact.id,
        topic: `${seededChoice(seed, idx * 41 + i, industries)} - ${seededChoice(seed, idx * 42 + i, ['Proyecto', 'Iniciativa', 'Oportunidad', 'Reto'])}`,
        source: seededRandom(seed, idx * 43 + i) > 0.5 ? 'Email' : 'LinkedIn',
        is_used: seededRandom(seed, idx * 44 + i) > 0.6,
        created_at: new Date().toISOString()
      })
    }
  })

  return topics
}

export interface DemoDataSet {
  contacts: Contact[]
  interactions: Interaction[]
  followUps: FollowUp[]
  tags: Tag[]
  outcomes: Outcome[]
  topics: ConversationTopic[]
}

export function generateFullDemoDataSet(seed: number, userId: string): DemoDataSet {
  const contacts = generateDemoContacts(seed, userId)
  return {
    contacts,
    interactions: generateDemoInteractions(seed, userId, contacts),
    followUps: generateDemoFollowUps(seed, userId, contacts),
    tags: generateDemoTags(seed, userId),
    outcomes: generateDemoOutcomes(seed, userId, contacts),
    topics: generateDemoTopics(seed, userId, contacts)
  }
}
