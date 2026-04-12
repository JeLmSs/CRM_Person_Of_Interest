import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ContactTier, InteractionSentiment, FollowUpFrequency } from './types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const tierConfig: Record<ContactTier, { label: string; color: string; bgColor: string; description: string }> = {
  S: { label: 'S — Strategic', color: 'text-amber-400', bgColor: 'bg-amber-400/10 border-amber-400/30', description: 'Key strategic contacts' },
  A: { label: 'A — High Priority', color: 'text-violet-400', bgColor: 'bg-violet-400/10 border-violet-400/30', description: 'High-value connections' },
  B: { label: 'B — Important', color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/30', description: 'Important relationships' },
  C: { label: 'C — Standard', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/30', description: 'Regular contacts' },
  D: { label: 'D — Low Priority', color: 'text-zinc-400', bgColor: 'bg-zinc-400/10 border-zinc-400/30', description: 'Occasional contacts' },
}

export const sentimentConfig: Record<InteractionSentiment, { label: string; emoji: string; color: string }> = {
  very_positive: { label: 'Muy positivo', emoji: '🔥', color: 'text-green-400' },
  positive: { label: 'Positivo', emoji: '👍', color: 'text-emerald-400' },
  neutral: { label: 'Neutral', emoji: '😐', color: 'text-zinc-400' },
  negative: { label: 'Negativo', emoji: '👎', color: 'text-orange-400' },
  very_negative: { label: 'Muy negativo', emoji: '💔', color: 'text-red-400' },
}

export const frequencyConfig: Record<FollowUpFrequency, { label: string; days: number }> = {
  daily: { label: 'Diario', days: 1 },
  weekly: { label: 'Semanal', days: 7 },
  biweekly: { label: 'Quincenal', days: 14 },
  monthly: { label: 'Mensual', days: 30 },
  quarterly: { label: 'Trimestral', days: 90 },
  custom: { label: 'Personalizado', days: 0 },
}

export function getRelationshipColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-emerald-400'
  if (score >= 40) return 'text-yellow-400'
  if (score >= 20) return 'text-orange-400'
  return 'text-red-400'
}

export function getRelationshipLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Buena'
  if (score >= 40) return 'Moderada'
  if (score >= 20) return 'Débil'
  return 'Fría'
}

export function getDaysUntilFollowUp(nextDate: string | null): number | null {
  if (!nextDate) return null
  const now = new Date()
  const target = new Date(nextDate)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export function getFollowUpUrgency(days: number | null): 'overdue' | 'urgent' | 'soon' | 'ok' | 'none' {
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days <= 2) return 'urgent'
  if (days <= 7) return 'soon'
  return 'ok'
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays > 0) {
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`
    return `Hace ${Math.floor(diffDays / 365)} años`
  }
  // Future dates
  const futureDays = Math.abs(diffDays)
  if (futureDays === 1) return 'Mañana'
  if (futureDays < 7) return `En ${futureDays} días`
  if (futureDays < 30) return `En ${Math.floor(futureDays / 7)} semanas`
  if (futureDays < 365) return `En ${Math.floor(futureDays / 30)} meses`
  return `En ${Math.floor(futureDays / 365)} años`
}

export function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName ? lastName.charAt(0).toUpperCase() : ''
  return first + last
}
