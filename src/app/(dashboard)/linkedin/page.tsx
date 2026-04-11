'use client'
import { useState } from 'react'
import { Link2, Search, UserPlus, TrendingUp, Sparkles, Globe, Building, MapPin, Briefcase, ArrowRight, Info } from 'lucide-react'

const recommendations = [
  { name:'María Rodríguez', headline:'VP de Estrategia Digital', company:'Repsol', location:'Madrid', reason:'Conectada con 3 de tus contactos Tier S', match:95 },
  { name:'Alberto Vega', headline:'Director General', company:'Acciona', location:'Madrid', reason:'Misma industria que tus contactos top', match:88 },
  { name:'Carmen Delgado', headline:'Managing Partner', company:'BCG', location:'Barcelona', reason:'Perfil complementario a Laura Fernández', match:82 },
  { name:'Pedro Navarro', headline:'CIO', company:'Mapfre', location:'Madrid', reason:'Intereses compartidos en transformación digital', match:78 },
  { name:'Sofía Herrera', headline:'Directora de Innovación', company:'Santander', location:'Madrid', reason:'Buscando perfiles como el tuyo', match:75 },
]

const networkStats = [
  { label:'Tecnología', count:4, pct:40 },{ label:'Energía', count:2, pct:20 },{ label:'Consultoría', count:2, pct:20 },{ label:'Finanzas', count:1, pct:10 },{ label:'Otros', count:1, pct:10 },
]

const cityStats = [
  { label:'Madrid', count:6, pct:60 },{ label:'Barcelona', count:2, pct:20 },{ label:'Valencia', count:1, pct:10 },{ label:'Bilbao', count:1, pct:10 },
]

export default function LinkedInPage() {
  const [profileUrl, setProfileUrl] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const handleAnalyze = () => {
    if (!profileUrl) return
    setAnalyzing(true)
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true) }, 1500)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg"><Link2 className="w-6 h-6 text-blue-400" /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">LinkedIn Intelligence</h1>
          <p className="text-zinc-400 text-sm">Analiza perfiles y descubre conexiones potenciales</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-300 font-medium">Integración LinkedIn en Beta</p>
          <p className="text-xs text-zinc-400 mt-1">Puedes analizar perfiles públicos manualmente. La integración completa con la API de LinkedIn estará disponible próximamente.</p>
        </div>
      </div>

      {/* Profile Analyzer */}
      <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Search className="w-5 h-5 text-blue-400" />Analizar perfil</h2>
        <div className="flex gap-3">
          <input type="url" value={profileUrl} onChange={e => { setProfileUrl(e.target.value); setAnalyzed(false) }}
            placeholder="https://linkedin.com/in/nombre-del-perfil" className="flex-1 px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          <button onClick={handleAnalyze} disabled={!profileUrl || analyzing}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {analyzing ? 'Analizando...' : 'Analizar'}
          </button>
        </div>
        {analyzed && (
          <div className="mt-4 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-400">DR</div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">David Romero</h3>
                <p className="text-sm text-zinc-400">Director de Transformación Digital en Naturgy</p>
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />Madrid, España</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['Transformación Digital','Energía','Innovación','Liderazgo','Sostenibilidad'].map(s => (
                    <span key={s} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs">{s}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-bold">Tier sugerido: A</span>
                  <span className="text-xs text-zinc-500">Compatibilidad: 87%</span>
                </div>
                <button className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                  <UserPlus className="w-4 h-4" />Añadir como contacto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" />Personas que deberías conocer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendations.map(r => (
            <div key={r.name} className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:border-indigo-500/20 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {r.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{r.name}</h3>
                  <p className="text-xs text-zinc-400">{r.headline}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><Building className="w-3 h-3" />{r.company} · {r.location}</p>
                  <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1"><Sparkles className="w-3 h-3" />{r.reason}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-500">Match: {r.match}%</span>
                    <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">Añadir <ArrowRight className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-400" />Industrias en tu red</h2>
          <div className="space-y-2.5">
            {networkStats.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-300 w-24 truncate">{s.label}</span>
                <div className="flex-1 h-4 bg-zinc-800/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width:`${s.pct}%` }} />
                </div>
                <span className="text-xs text-zinc-400 w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400" />Ciudades en tu red</h2>
          <div className="space-y-2.5">
            {cityStats.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-300 w-24 truncate">{s.label}</span>
                <div className="flex-1 h-4 bg-zinc-800/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full" style={{ width:`${s.pct}%` }} />
                </div>
                <span className="text-xs text-zinc-400 w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
