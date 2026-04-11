'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/hooks'
import { Profile, ContactTier, FollowUpFrequency } from '@/lib/types/database'
import {
  User,
  Save,
  Download,
  LogOut,
  Trash2,
  Lock,
  Globe,
  Bell,
  Database,
  Settings,
  Briefcase,
  Building2,
  ExternalLink,
  Clock,
  Shield,
  Info,
  Loader2,
  Check,
  ChevronDown,
} from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const { user, loading: userLoading } = useUser()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile fields
  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [timezone, setTimezone] = useState('America/Mexico_City')

  // Preferences
  const [defaultFrequency, setDefaultFrequency] = useState<FollowUpFrequency>('monthly')
  const [defaultTier, setDefaultTier] = useState<ContactTier>('C')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [language, setLanguage] = useState('es')

  // Data stats
  const [contactCount, setContactCount] = useState(0)
  const [interactionCount, setInteractionCount] = useState(0)

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Demo mode
  const [demoMode, setDemoMode] = useState(false)

  // Export states
  const [exportingContacts, setExportingContacts] = useState(false)
  const [exportingInteractions, setExportingInteractions] = useState(false)

  // Fetch profile and stats
  useEffect(() => {
    if (!user) return

    async function fetchData() {
      setLoading(true)

      const [profileRes, contactsRes, interactionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('interactions').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ])

      if (profileRes.data) {
        const p = profileRes.data as Profile
        setProfile(p)
        setFullName(p.full_name || '')
        setJobTitle(p.job_title || '')
        setCompany(p.company || '')
        setLinkedinUrl(p.linkedin_url || '')
        setTimezone(p.timezone || 'America/Mexico_City')
      }

      setContactCount(contactsRes.count || 0)
      setInteractionCount(interactionsRes.count || 0)
      setLoading(false)
    }

    fetchData()
  }, [user, supabase])

  // Read demo mode from localStorage on mount
  useEffect(() => {
    setDemoMode(localStorage.getItem('demoMode') === 'true')
  }, [])

  const handleToggleDemoMode = useCallback((enabled: boolean) => {
    setDemoMode(enabled)
    localStorage.setItem('demoMode', String(enabled))
  }, [])

  // Save profile
  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)

    await supabase
      .from('profiles')
      .update({
        full_name: fullName || null,
        job_title: jobTitle || null,
        company: company || null,
        linkedin_url: linkedinUrl || null,
        timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [user, fullName, jobTitle, company, linkedinUrl, timezone, supabase])

  // Change password
  const handleChangePassword = useCallback(async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setShowPasswordForm(false)
        setPasswordSuccess(false)
      }, 2000)
    }
  }, [newPassword, confirmPassword, supabase])

  // Export contacts CSV
  const handleExportContacts = useCallback(async () => {
    if (!user) return
    setExportingContacts(true)

    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('last_name', { ascending: true })

    if (data && data.length > 0) {
      const headers = [
        'Nombre', 'Apellido', 'Email', 'Teléfono', 'Empresa', 'Cargo',
        'LinkedIn', 'Tier', 'Estado', 'Ciudad', 'País', 'Frecuencia de seguimiento',
        'Último contacto', 'Próximo seguimiento', 'Puntuación', 'Notas',
      ]
      const rows = data.map((c) => [
        c.first_name, c.last_name || '', c.email || '', c.phone || '',
        c.company || '', c.job_title || '', c.linkedin_url || '',
        c.tier, c.status, c.city || '', c.country || '',
        c.follow_up_frequency, c.last_contact_date || '', c.next_follow_up_date || '',
        c.relationship_score, c.notes || '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sphere_contactos_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    setExportingContacts(false)
  }, [user, supabase])

  // Export interactions CSV
  const handleExportInteractions = useCallback(async () => {
    if (!user) return
    setExportingInteractions(true)

    const { data } = await supabase
      .from('interactions')
      .select('*, contacts(first_name, last_name)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (data && data.length > 0) {
      const headers = [
        'Fecha', 'Tipo', 'Título', 'Contacto', 'Sentimiento',
        'Duración (min)', 'Lugar', 'Descripción',
      ]
      const rows = data.map((i: Record<string, unknown>) => {
        const contact = i.contacts as { first_name: string; last_name: string | null } | null
        return [
          i.date, i.type, i.title,
          contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : '',
          i.sentiment, i.duration_minutes || '', i.location || '', i.description || '',
        ]
      })

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sphere_interacciones_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    setExportingInteractions(false)
  }, [user, supabase])

  // Logout
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [supabase])

  // Delete account
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== 'ELIMINAR') return
    // In production, this would call an edge function or API route
    // that uses the service role key to delete the user
    await supabase.auth.signOut()
    window.location.href = '/'
  }, [deleteConfirmText, supabase])

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (userLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  const inputClasses =
    'w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20'
  const selectClasses =
    'w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 pr-10 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20'
  const labelClasses = 'block text-sm font-medium text-zinc-400 mb-1.5'
  const cardClasses = 'bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6'
  const sectionTitleClasses = 'text-lg font-semibold text-zinc-100 flex items-center gap-2.5'

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
          <Settings className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Configuración</h1>
          <p className="text-sm text-zinc-500">Gestiona tu perfil, preferencias y cuenta</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className={cardClasses}>
        <h2 className={sectionTitleClasses}>
          <User className="h-5 w-5 text-indigo-400" />
          Mi Perfil
        </h2>

        {/* Avatar */}
        <div className="mt-5 flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
            {fullName ? getInitials(fullName) : user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-base font-medium text-zinc-100">{fullName || 'Sin nombre'}</p>
            <p className="text-sm text-zinc-500">{user?.email}</p>
          </div>
        </div>

        {/* Form */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClasses}>
              <Briefcase className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>
              <Briefcase className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Cargo
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Director de Ventas"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>
              <Building2 className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Empresa
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>
              <ExternalLink className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              LinkedIn URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/tu-perfil"
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>
              <Clock className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Zona horaria
            </label>
            <div className="relative">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={selectClasses}
              >
                <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                <option value="America/Bogota">Bogotá (UTC-5)</option>
                <option value="America/Lima">Lima (UTC-5)</option>
                <option value="America/Santiago">Santiago (UTC-4)</option>
                <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
                <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                <option value="Europe/Madrid">Madrid (UTC+1)</option>
                <option value="America/New_York">Nueva York (UTC-5)</option>
                <option value="America/Los_Angeles">Los Ángeles (UTC-8)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
          </button>
          {saved && <span className="text-sm text-emerald-400">Perfil actualizado correctamente</span>}
        </div>
      </div>

      {/* Preferences Section */}
      <div className={cardClasses}>
        <h2 className={sectionTitleClasses}>
          <Settings className="h-5 w-5 text-indigo-400" />
          Preferencias
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClasses}>Frecuencia de seguimiento por defecto</label>
            <div className="relative">
              <select
                value={defaultFrequency}
                onChange={(e) => setDefaultFrequency(e.target.value as FollowUpFrequency)}
                className={selectClasses}
              >
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Tier por defecto para nuevos contactos</label>
            <div className="relative">
              <select
                value={defaultTier}
                onChange={(e) => setDefaultTier(e.target.value as ContactTier)}
                className={selectClasses}
              >
                <option value="S">S - Estratégico</option>
                <option value="A">A - Alta prioridad</option>
                <option value="B">B - Importante</option>
                <option value="C">C - Normal</option>
                <option value="D">D - Bajo contacto</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">Notificaciones por email</p>
                  <p className="text-xs text-zinc-500">Recibe recordatorios de seguimiento por correo</p>
                </div>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  emailNotifications ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    emailNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div>
            <label className={labelClasses}>
              <Globe className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Idioma
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={selectClasses}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className={cardClasses}>
        <h2 className={sectionTitleClasses}>
          <Database className="h-5 w-5 text-indigo-400" />
          Gestión de Datos
        </h2>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-indigo-400">{contactCount}</p>
            <p className="text-xs text-zinc-500">Contactos</p>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-violet-400">{interactionCount}</p>
            <p className="text-xs text-zinc-500">Interacciones</p>
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div className="mt-5 flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Datos de demostración</p>
              <p className="text-xs text-zinc-500">Muestra contactos e interacciones de ejemplo cuando no hay datos reales</p>
            </div>
          </div>
          <button
            onClick={() => handleToggleDemoMode(!demoMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              demoMode ? 'bg-indigo-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                demoMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Export Buttons */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleExportContacts}
            disabled={exportingContacts}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50"
          >
            {exportingContacts ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar contactos (CSV)
          </button>
          <button
            onClick={handleExportInteractions}
            disabled={exportingInteractions}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50"
          >
            {exportingInteractions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar interacciones (CSV)
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className={cardClasses}>
        <h2 className={sectionTitleClasses}>
          <Shield className="h-5 w-5 text-indigo-400" />
          Cuenta
        </h2>

        <div className="mt-5 space-y-4">
          {/* Email */}
          <div>
            <label className={labelClasses}>Correo electrónico</label>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-2.5">
              <span className="text-sm text-zinc-400">{user?.email}</span>
              <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">Solo lectura</span>
            </div>
          </div>

          {/* Change Password */}
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800"
            >
              <Lock className="h-4 w-4" />
              Cambiar contraseña
            </button>
          ) : (
            <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-3">
              <div>
                <label className={labelClasses}>Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className={inputClasses}
                />
              </div>
              {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-emerald-400">Contraseña actualizada correctamente</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Actualizar
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordError('')
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-zinc-800/50" />

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:border-red-800 hover:bg-red-950/50"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar cuenta
              </button>
            ) : (
              <div className="flex-1 rounded-lg border border-red-900/50 bg-red-950/20 p-4 space-y-3">
                <p className="text-sm text-red-300">
                  Esta acción es irreversible. Se eliminarán todos tus datos. Escribe{' '}
                  <span className="font-mono font-bold">ELIMINAR</span> para confirmar.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="ELIMINAR"
                    className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300 placeholder-red-800 outline-none focus:border-red-700"
                  />
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'ELIMINAR'}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className={cardClasses}>
        <h2 className={sectionTitleClasses}>
          <Info className="h-5 w-5 text-indigo-400" />
          Acerca de
        </h2>
        <div className="mt-4 space-y-2">
          <p className="text-base font-semibold text-zinc-100">Sphere v1.0</p>
          <p className="text-sm font-medium text-indigo-400">Tu red profesional, amplificada</p>
          <p className="text-sm leading-relaxed text-zinc-500">
            Sphere es un CRM de networking inteligente diseñado para directivos y profesionales
            que quieren construir y mantener relaciones estratégicas. Gestiona contactos por tiers
            de prioridad, registra interacciones, programa seguimientos automáticos y mide los
            resultados de tu red profesional.
          </p>
        </div>
      </div>
    </div>
  )
}
