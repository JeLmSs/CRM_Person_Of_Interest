'use client'
import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AiConversation } from '@/lib/types/database'
import { Send, Trash2, Sparkles, Loader2 } from 'lucide-react'

const CONTACT_SUGGESTIONS = [
  '¿Cómo rompo el hielo en la próxima sesión con esta persona?',
  '¿Qué sectores encajan con su perfil profesional?',
  'Redacta un mensaje de seguimiento tras nuestra última reunión',
  '¿Qué recursos o formaciones le recomendaría?',
  '¿Cómo valoro el estado de su búsqueda de empleo?',
  'Sugiere preguntas para la próxima entrevista de orientación',
]

const GENERAL_SUGGESTIONS = [
  '¿Cómo motivo a alguien que lleva meses sin encontrar trabajo?',
  '¿Qué técnicas de búsqueda de empleo funcionan mejor hoy?',
  'Ayúdame a preparar un taller de LinkedIn para candidatos',
  '¿Cómo detecto si un candidato está saboteando su búsqueda?',
  '¿Cómo preparo a alguien para una entrevista por competencias?',
  'Dame un guión para una primera sesión de orientación laboral',
]

// ─── Inline markdown renderer ───────────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**'))
      return <em key={i} className="italic text-zinc-300">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="px-1.5 py-0.5 bg-zinc-700/70 rounded text-[0.85em] font-mono text-indigo-300">{part.slice(1, -1)}</code>
    return part
  })
}

function AIContent({ text }: { text: string }) {
  if (text.startsWith('⚠️')) {
    return <p className="text-red-400 text-sm leading-relaxed">{text}</p>
  }
  const blocks = text.split(/\n{2,}/).filter(Boolean)
  return (
    <div className="space-y-3 text-[0.9375rem] leading-[1.75] text-zinc-200">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(Boolean)

        // Numbered list
        if (lines.some(l => /^\d+\.\s/.test(l))) {
          return (
            <ol key={bi} className="space-y-2 pl-1">
              {lines.filter(l => /^\d+\.\s/.test(l)).map((l, li) => (
                <li key={li} className="flex gap-3">
                  <span className="text-indigo-400 shrink-0 font-mono text-xs mt-[5px] w-4 text-right">{li + 1}.</span>
                  <span>{renderInline(l.replace(/^\d+\.\s/, ''))}</span>
                </li>
              ))}
            </ol>
          )
        }

        // Bullet list
        if (lines.some(l => /^[-*•]\s/.test(l))) {
          return (
            <ul key={bi} className="space-y-2 pl-1">
              {lines.filter(l => /^[-*•]\s/.test(l)).map((l, li) => (
                <li key={li} className="flex gap-3">
                  <span className="text-indigo-400 shrink-0 mt-[6px] text-xs">▸</span>
                  <span>{renderInline(l.replace(/^[-*•]\s/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }

        // Heading
        const hMatch = lines[0]?.match(/^#{1,3}\s(.+)/)
        if (hMatch) {
          return (
            <p key={bi} className="font-semibold text-white text-base">
              {renderInline(hMatch[1])}
            </p>
          )
        }

        // Paragraph (handle single-newline breaks within the block)
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

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center py-1 px-1">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }}
        />
      ))}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────
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
  const bottomRef = useRef<HTMLDivElement>(null)
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    const optimisticId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optimisticId,
      user_id: '',
      contact_id: contactId || '',
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
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
        id: `ai-${Date.now()}`,
        user_id: '',
        contact_id: contactId || '',
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
      } as AiConversation])
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Error al contactar con Sphere AI'
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        user_id: '',
        contact_id: contactId || '',
        role: 'assistant',
        content: `⚠️ ${errMsg}`,
        created_at: new Date().toISOString(),
      } as AiConversation])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  async function clearConversation() {
    if (!confirm('¿Borrar toda la conversación?')) return
    const supabase = createClient()
    if (contactId) {
      await supabase.from('ai_conversations').delete().eq('contact_id', contactId)
    } else {
      await supabase.from('ai_conversations').delete().is('contact_id', null)
    }
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const emptyHeading = isContactMode
    ? `¿En qué puedo ayudarte con ${contactName}?`
    : '¿En qué puedo ayudarte hoy?'
  const emptySubtext = isContactMode
    ? 'Tengo acceso al perfil completo, historial e interacciones de este candidato.'
    : 'Tu asistente de orientación laboral. Selecciona un candidato o hazme una pregunta general.'

  const shell = embedded
    ? 'flex flex-col h-full bg-[#09090b]'
    : 'flex flex-col h-full bg-[#0f0f14] border border-zinc-800/50 rounded-xl overflow-hidden'

  return (
    <div className={shell}>
      {/* Header — only in non-embedded mode */}
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-white truncate">
              {isContactMode ? `Contexto: ${contactName}` : 'Sphere AI'}
            </span>
          </div>
          {messages.length > 0 && (
            <button onClick={clearConversation}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors shrink-0 ml-2"
              title="Borrar conversación">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Messages area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loadingHistory ? (
          <div className="flex justify-center pt-20">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>

        ) : messages.length === 0 ? (
          /* ── Empty state ─────────────────────────────── */
          <div className="flex flex-col items-center justify-center h-full px-6 pb-6">
            <div className="w-full max-w-xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600/25 to-indigo-900/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-1.5">{emptyHeading}</h2>
              <p className="text-sm text-zinc-500 mb-8 max-w-sm mx-auto">{emptySubtext}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestions.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="group px-4 py-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-sm text-zinc-400 hover:text-zinc-100 transition-all duration-150 leading-snug text-left">
                    <span className="text-indigo-500 mr-2 group-hover:text-indigo-400 transition-colors text-xs">↗</span>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (
          /* ── Message list ────────────────────────────── */
          <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-1">
            {messages.map((msg) => (
              msg.role === 'user' ? (
                /* User bubble */
                <div key={msg.id} className="flex justify-end py-1">
                  <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-tr-md bg-indigo-600 text-white text-sm leading-relaxed whitespace-pre-wrap shadow-md shadow-indigo-900/20">
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* AI row */
                <div key={msg.id} className="flex gap-3.5 py-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[11px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Sphere AI</p>
                    <AIContent text={msg.content} />
                  </div>
                </div>
              )
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex gap-3.5 py-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="flex-1 pt-2">
                  <p className="text-[11px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Sphere AI</p>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Bottom: quick chips + input ───────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-800/40">
        {/* Quick suggestion pills — shown when chat has messages */}
        {messages.length > 0 && (
          <div className="px-4 pt-3 overflow-x-auto">
            <div className="flex gap-2 w-max max-w-full pb-0.5">
              {suggestions.slice(0, 4).map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-zinc-800/60 hover:bg-indigo-600/10 border border-zinc-700/60 hover:border-indigo-500/30 text-zinc-500 hover:text-indigo-300 transition-all whitespace-nowrap max-w-[200px] truncate">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pt-3 pb-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-0 bg-zinc-900 border border-zinc-700/70 hover:border-zinc-600 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/10 rounded-2xl transition-all shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); resizeTextarea() }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribe tu pregunta… (Enter para enviar)"
                className="flex-1 px-4 py-3.5 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
                style={{ minHeight: '52px', maxHeight: '160px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="m-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-[11px] text-zinc-600">
                Sphere AI · Solo orientación laboral y networking profesional
              </p>
              {messages.length > 0 && (
                <button onClick={clearConversation}
                  className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  Borrar chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
