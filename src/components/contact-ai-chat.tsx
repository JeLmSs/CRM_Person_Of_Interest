'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AiConversation } from '@/lib/types/database'
import { Send, Trash2, Sparkles, Loader2 } from 'lucide-react'

const SUGGESTED_QUESTIONS = [
  '¿Qué temas son buenos para romper el hielo con este contacto?',
  '¿Cómo puedo aportar valor a esta persona en la próxima interacción?',
  'Redáctame un mensaje de seguimiento para después de nuestra última reunión',
  '¿Qué oportunidades de colaboración veo con este contacto?',
  '¿Cómo está el estado de nuestra relación y qué puedo mejorar?',
  'Sugiere un email para reconectar con este contacto',
]

interface Props {
  contactId: string
  contactName: string
}

export default function ContactAIChat({ contactId, contactName }: Props) {
  const [messages, setMessages] = useState<AiConversation[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('ai_conversations')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as AiConversation[])
        setLoadingHistory(false)
      })
  }, [contactId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setError(null)
    setLoading(true)

    // Optimistic user message
    const optimistic: AiConversation = {
      id: `temp-${Date.now()}`,
      user_id: '',
      contact_id: contactId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')

      const assistantMsg: AiConversation = {
        id: `temp-ai-${Date.now()}`,
        user_id: '',
        contact_id: contactId,
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al contactar con la IA')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  async function clearConversation() {
    if (!confirm('¿Borrar toda la conversación con la IA?')) return
    const supabase = createClient()
    await supabase.from('ai_conversations').delete().eq('contact_id', contactId)
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-[#0f0f14] border border-zinc-800/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Preparar interacción con {contactName}</span>
        </div>
        {messages.length > 0 && (
          <button onClick={clearConversation} title="Borrar conversación"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
          <div className="flex justify-center pt-8">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center pt-4">
              <p className="text-sm text-zinc-400">
                Pregúntame cualquier cosa sobre {contactName} para preparar tu próxima interacción. Tengo acceso a todo su perfil, historial y notas.
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-2 font-medium">Preguntas sugeridas:</p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-zinc-900/60 hover:bg-indigo-600/10 border border-zinc-800 hover:border-indigo-500/30 text-xs text-zinc-300 hover:text-indigo-300 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-zinc-800/70 text-zinc-200 rounded-bl-sm border border-zinc-700/50'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-zinc-800/70 border border-zinc-700/50">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-400 text-center px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/50 p-3">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-zinc-800/60 hover:bg-indigo-600/15 border border-zinc-700 hover:border-indigo-500/40 text-zinc-400 hover:text-indigo-400 transition-colors">
                {q.length > 45 ? q.slice(0, 45) + '…' : q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Pregunta algo sobre este contacto… (Enter para enviar)"
            className="flex-1 px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
