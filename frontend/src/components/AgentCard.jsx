import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const AGENT_CONFIG = {
  Scout: {
    color: '#10b981', icon: '🔍', role: 'Intelligence Gathering',
    model: 'Featherless · Mistral-7B',
    description: 'Rapid fact extraction, stakeholder mapping, urgency triage',
    border: 'border-emerald-500/25', bg: 'bg-emerald-500/5', colorName: 'text-emerald-400',
    dot: 'bg-emerald-400', shadow: '0 0 20px rgba(16,185,129,0.12)',
  },
  Analyst: {
    color: '#f59e0b', icon: '📊', role: 'Deep Analysis',
    model: 'Gemini 2.5 Flash',
    description: 'Financial modeling, risk matrices, root cause analysis',
    border: 'border-amber-500/25', bg: 'bg-amber-500/5', colorName: 'text-amber-400',
    dot: 'bg-amber-400', shadow: '0 0 20px rgba(245,158,11,0.12)',
  },
  Strategist: {
    color: '#ec4899', icon: '🎯', role: 'Strategic Planning',
    model: 'Gemini 2.5 Flash',
    description: 'Competitive dynamics, strategic options, long-horizon thinking',
    border: 'border-pink-500/25', bg: 'bg-pink-500/5', colorName: 'text-pink-400',
    dot: 'bg-pink-400', shadow: '0 0 20px rgba(236,72,153,0.12)',
  },
  Communicator: {
    color: '#3b82f6', icon: '📢', role: 'Stakeholder Mgmt',
    model: 'Gemini 2.5 Flash',
    description: 'Communication drafts, stakeholder maps, messaging strategy',
    border: 'border-blue-500/25', bg: 'bg-blue-500/5', colorName: 'text-blue-400',
    dot: 'bg-blue-400', shadow: '0 0 20px rgba(59,130,246,0.12)',
  },
  Guardian: {
    color: '#f43f5e', icon: '🛡️', role: 'Trust & Security Audit',
    model: 'Gemini 2.5 Flash + Veea Lobster Trap',
    description: 'Audits all agent outputs for injection, hallucinations and policy violations',
    border: 'border-rose-500/30', bg: 'bg-rose-500/5', colorName: 'text-rose-400',
    dot: 'bg-rose-400', shadow: '0 0 20px rgba(244,63,94,0.15)',
  },
    Orchestrator: {
    color: '#6366f1', icon: '🎭', role: 'Synthesis & Decision',
    model: 'Gemini 2.5 Flash',
    description: 'Integrates all agents into one definitive executive brief',
    border: 'border-indigo-500/35', bg: 'bg-indigo-500/8', colorName: 'text-indigo-400',
    dot: 'bg-indigo-400', shadow: '0 0 30px rgba(99,102,241,0.18)',
  },
}

function StatusIcon({ status }) {
  if (status === 'thinking' || status === 'streaming') return <Loader2 size={12} className="animate-spin text-white/60" />
  if (status === 'complete') return <CheckCircle2 size={12} className="text-emerald-400" />
  if (status === 'error') return <AlertCircle size={12} className="text-red-400" />
  return null
}

export default function AgentCard({ name, state, isOrchestrator = false }) {
  const cfg = AGENT_CONFIG[name] || AGENT_CONFIG.Scout
  const { status = 'idle', content = '', keyPoints = [], title = '', confidence } = state || {}
  const [expanded, setExpanded] = useState(false)

  const isActive = status === 'thinking' || status === 'streaming'
  const isComplete = status === 'complete'
  const hasContent = content.length > 0

  const displayContent = content
  const truncated = displayContent.length > 260
  const shown = (expanded || isOrchestrator) ? displayContent : displayContent.slice(0, 260)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: 1, y: 0,
        boxShadow: isActive ? cfg.shadow : 'none',
      }}
      transition={{ duration: 0.3 }}
      className={`agent-card relative rounded-xl border bg-nexus-card overflow-hidden flex flex-col ${cfg.border} ${isActive ? cfg.bg : ''}`}
      style={{ minHeight: isOrchestrator ? 140 : 100 }}
    >
      {/* Active scan line */}
      {isActive && (
        <div
          className="absolute inset-x-0 h-px opacity-60 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
            animation: 'scan 1.8s linear infinite',
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="relative flex-shrink-0">
          <span className="text-base leading-none">{cfg.icon}</span>
          {isActive && (
            <span
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${cfg.dot} agent-ping`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className={`text-xs font-display font-700 tracking-wide ${cfg.colorName}`}>
              {name}
            </h3>
            <StatusIcon status={status} />
          </div>
          <p className="text-[9px] text-[var(--text-secondary)] truncate leading-tight">{cfg.role}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-3 pb-2 min-h-0">
        {!hasContent && status === 'idle' && (
          <p className="text-[10px] text-[var(--border)] italic">{cfg.description}</p>
        )}

        {isActive && !hasContent && (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className={`w-1 h-1 rounded-full ${cfg.dot}`}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">Analyzing...</span>
          </div>
        )}

        {hasContent && (
          <div>
            {keyPoints.length > 0 && isComplete ? (
              <ul className="space-y-0.5">
                {keyPoints.slice(0, 3).map((pt, i) => (
                  <li key={i} className="text-[10px] text-[var(--text-secondary)] flex items-start gap-1.5 leading-relaxed">
                    <span style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5">›</span>
                    <span className="line-clamp-2">{pt}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <p className={`text-[10px] leading-relaxed text-[var(--text-secondary)] ${isActive ? 'typing-cursor' : ''} whitespace-pre-wrap`}>
                  {shown}
                </p>
                {truncated && !isOrchestrator && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className={`flex items-center gap-0.5 mt-1 text-[9px] ${cfg.colorName} hover:opacity-80 transition-opacity`}
                  >
                    {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                    {expanded ? 'Less' : 'More'}
                  </button>
                )}
              </div>
            )}

            {/* Confidence bar */}
            {isComplete && confidence && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className="flex-1 h-0.5 bg-nexus-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: cfg.color }}
                  />
                </div>
                <span className="text-[9px] font-mono" style={{ color: cfg.color }}>
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Model Badge */}
      <div className="px-3 pb-2">
        <span className="text-[8px] font-mono text-[var(--border)] tracking-wide">{cfg.model}</span>
      </div>
    </motion.div>
  )
}
