'use client'
import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AiConversation } from '@/lib/types/database'
import { Send, Trash2, Sparkles, Loader2, SquarePen } from 'lucide-react'

const CONTACT_SUGGESTIONS = [
  '¿Cómo rompo el hielo en la próxima sesión?',
  '¿Qué sectores encajan con su perfil?',
  'Redacta un mensaje de seguimiento',
  '¿Qué recursos o formaciones le recomendaría?',
  '¿Cómo valoro su búsqueda de empleo?',
  'Preguntas para la próxima entrevista',
]

const GENERAL_SUGGESTIONS = [
  '¿Cómo motivo a alguien sin empleo hace meses?',
  '¿Qué técnicas de búsqueda funcionan hoy?',
  'Prepara un taller de LinkedIn',
  '¿Cómo detecto bloqueos en un candidato?',
  '¿Cómo preparo una entrevista por competencias?',
  'Guión para primera sesión de orientación',
]

// ─── Markdown inline renderer ─────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**'))
      return <em key={i} className="italic text-zinc-300">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="px-1 py-0.5 bg-zinc-700/70 rounded text-[0.8em] font-mono text-indigo-300">{part.slice(1, -1)}</code>
    return part
  })
}

function AIContent({ text }: { text: string }) {
  if (text.startsWith('⚠️'))
    return <p className="text-red-400 text-sm leading-relaxed">{text}</p>

  const blocks = text.split(/\n{2,}/).filter(Boolean)
  return (
    <div className="space-y-2.5 text-sm leading-[1.7] text-zinc-200">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(Boolean)
        // Horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(block.trim()))
          return <hr key={bi} className="border-zinc-700/50 my-1" />
        if (lines.some(l => /^\d+\.\s/.test(l))) {
          return (
            <ol key={bi} className="space-y-1.5">
              {lines.filter(l => /^\d+\.\s/.test(l)).map((l, li) => (
                <li key={li} className="flex gap-2.5">
                  <span className="text-indigo-400 shrink-0 font-mono text-xs mt-[4px] w-4 text-right">{li + 1}.</span>
                  <span>{renderInline(l.replace(/^\d+\.\s/, ''))}</span>
                </li>
              ))}
            </ol>
          )
        }
        if (lines.some(l => /^[-*•]\s/.test(l))) {
          return (
            <ul key={bi} className="space-y-1.5">
              {lines.filter(l => /^[-*•]\s/.test(l)).map((l, li) => (
                <li key={li} className="flex gap-2.5">
                  <span className="text-indigo-400 shrink-0 mt-[5px] text-xs">▸</span>
                  <span>{renderInline(l.replace(/^[-*•]\s/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }
        const hMatch = lines[0]?.match(/^#{1,3}\s(.+)/)
        if (hMatch)
          return <p key={bi} className="font-semibold text-white">{renderInline(hMatch[1])}</p>
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <React.Fragment key={li}>
                {renderInline(l)}
                {li < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center py-1">
      {[0, 160, 320].map(delay => (
        <span key={delay} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }} />
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  contactId?: string | null
  contactName?: string | null
  embedded?: boolean
}

export default function ContactAIChat({ contactId, contactName, embedded }: Props) {
  const [messages, setMessages] = useState<AiConversation[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const messagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isContactMode = !!contactId
  const suggestions = isContactMode ? CONTACT_SUGGESTIONS : GENERAL_SUGGESTIONS

  useEffect(() => {
    const supabase = createClient()
    const query = contactId
      ? supabase.from('ai_conversations').select('*').eq('contact_id', contactId).order('created_at', { ascending: true })
      : supabase.from('ai_conversations').select('*').is('contact_id', null).order('created_at', { ascending: true }).limit(60)
    query.then(({ data }) => {
      if (data) setMessages(data as AiConversation[])
      setLoadingHistory(false)
    })
  }, [contactId])

  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    // rAF ensures DOM has fully painted before measuring scrollHeight
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [messages, loading])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    const optimisticId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optimisticId, user_id: '', contact_id: contactId || '',
      role: 'user', content: trimmed, created_at: new Date().toISOString(),
    } as AiConversation])

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId || null, message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, user_id: '', contact_id: contactId || '',
        role: 'assistant', content: data.reply, created_at: new Date().toISOString(),
      } as AiConversation])
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Error al contactar con Sphere AI'
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, user_id: '', contact_id: contactId || '',
        role: 'assistant', content: `⚠️ ${errMsg}`, created_at: new Date().toISOString(),
      } as AiConversation])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  async function clearConversation() {
    if (!confirm('¿Empezar nueva conversación? Se borrará el historial.')) return
    const supabase = createClient()
    if (contactId) await supabase.from('ai_conversations').delete().eq('contact_id', contactId)
    else await supabase.from('ai_conversations').delete().is('contact_id', null)
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const emptyHeading = isContactMode ? `¿En qué puedo ayudarte con ${contactName}?` : '¿En qué puedo ayudarte hoy?'
  const emptySubtext = isContactMode
    ? 'Tengo acceso al perfil completo, historial e interacciones de este candidato.'
    : 'Tu asistente de orientación laboral. Selecciona un candidato o hazme una pregunta general.'

  return (
    <div className={embedded
      ? 'flex flex-col h-full bg-[#09090b]'
      : 'flex flex-col h-full bg-[#0f0f14] border border-zinc-800/50 rounded-xl overflow-hidden'
    }>
      {/* Header — only in standalone (tab) mode */}
      {!embedded && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-white truncate">
              {isContactMode ? `Contexto: ${contactName}` : 'Sphere AI'}
            </span>
          </div>
          {messages.length > 0 && (
            <button onClick={clearConversation} title="Nuevo chat" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-indigo-400 transition-colors shrink-0 ml-2">
              <SquarePen className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto min-h-0">
        {loadingHistory ? (
          <div className="flex justify-center pt-16">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>

        ) : messages.length === 0 ? (
          /* ── Empty state: compact, mobile-first ─────────────────────────── */
          <div className="flex flex-col items-center justify-center h-full px-4 pb-4 gap-6">
            {/* Icon + heading */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600/25 to-indigo-900/5 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-base font-semibold text-white leading-snug mb-1">{emptyHeading}</h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">{emptySubtext}</p>
            </div>

            {/* Horizontal-scroll suggestion cards — compact, mobile-friendly */}
            <div className="w-full overflow-x-auto -mx-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-2 px-4" style={{ width: 'max-content' }}>
                {suggestions.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="shrink-0 w-40 text-left px-3 py-2.5 rounded-xl bg-zinc-900/60 hover:bg-indigo-600/10 border border-zinc-800 hover:border-indigo-500/30 text-xs text-zinc-400 hover:text-indigo-300 transition-colors leading-snug">
                    <span className="text-indigo-500 block mb-1 text-[10px]">↗</span>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (
          /* ── Message list ────────────────────────────────────────────────── */
          <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-1">
            {messages.map(msg =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end py-1">
                  <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-md bg-indigo-600 text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/15 border border-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[10px] font-semibold text-zinc-600 mb-1.5 uppercase tracking-widest">Sphere AI</p>
                    <AIContent text={msg.content} />
                  </div>
                </div>
              )
            )}
            {loading && (
              <div className="flex gap-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/15 border border-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="flex-1 pt-2.5">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-800/40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Input */}
        <div className="px-3 pt-2 pb-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end bg-zinc-900 border border-zinc-700/60 hover:border-zinc-600 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/20 rounded-2xl transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); resizeTextarea() }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribe tu pregunta…"
                className="flex-1 px-3.5 py-3 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
                style={{ minHeight: '46px', maxHeight: '140px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="m-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <p className="text-[10px] text-zinc-600">Sphere AI · Solo orientación laboral</p>
              {messages.length > 0 && (
                <button onClick={clearConversation}
                  className="text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1">
                  <SquarePen className="w-2.5 h-2.5" />
                  Nuevo chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
