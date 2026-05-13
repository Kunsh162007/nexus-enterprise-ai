import React from 'react'
import { motion } from 'framer-motion'
import AgentCard from './AgentCard'

const TOP_AGENTS   = ['Scout', 'Analyst', 'Strategist', 'Communicator']
const TRUST_AGENT  = 'Guardian'
const BOTTOM_AGENT = 'Orchestrator'

const TRUST_COLORS = {
  idle:      { border: 'border-rose-500/20',  glow: 'none' },
  thinking:  { border: 'border-rose-500/50',  glow: '0 0 30px rgba(244,63,94,0.2)' },
  streaming: { border: 'border-rose-500/50',  glow: '0 0 30px rgba(244,63,94,0.2)' },
  complete:  { border: 'border-rose-500/40',  glow: '0 0 20px rgba(244,63,94,0.1)' },
  error:     { border: 'border-red-500/50',   glow: 'none' },
}

export default function AgentGrid({ agentStates, sessionStatus }) {
  const guardianStatus = agentStates?.Guardian?.status || 'idle'
  const orchStatus     = agentStates?.Orchestrator?.status || 'idle'
  const trustStyle     = TRUST_COLORS[guardianStatus] || TRUST_COLORS.idle

  return (
    <div className="h-full flex flex-col gap-2.5">

      {/* ── Row 1: 4 specialist agents ─────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 flex-shrink-0">
        {TOP_AGENTS.map((name, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <AgentCard name={name} state={agentStates?.[name]} />
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: Guardian trust layer (full width) ───────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="flex-shrink-0"
      >
        <div
          className={`rounded-xl border-2 bg-nexus-card overflow-hidden transition-all duration-500 ${trustStyle.border}`}
          style={{ boxShadow: trustStyle.glow }}
        >
          <GuardianPanel state={agentStates?.Guardian} />
        </div>
      </motion.div>

      {/* ── Row 3: Orchestrator (full width, expands) ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex-1 min-h-0"
      >
        {/* Connector lines from Guardian → Orchestrator */}
        {(orchStatus === 'thinking' || orchStatus === 'streaming') && (
          <div className="relative h-0">
            <div className="absolute -top-2 left-0 right-0 flex justify-around px-12">
              {[0,1,2,3].map(i => (
                <div
                  key={i}
                  className="w-px h-2 opacity-40"
                  style={{
                    background: '#6366f1',
                    animation: `pulse 1s ease-in-out ${i * 0.12}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div
          className="h-full rounded-xl border-2 bg-nexus-card overflow-hidden"
          style={{
            borderColor: orchStatus === 'complete' ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.2)',
            boxShadow: (orchStatus === 'thinking' || orchStatus === 'streaming')
              ? '0 0 40px rgba(99,102,241,0.2), inset 0 0 40px rgba(99,102,241,0.05)'
              : 'none',
          }}
        >
          <OrchestratorPanel state={agentStates?.Orchestrator} />
        </div>
      </motion.div>
    </div>
  )
}

// ── Guardian inline panel ──────────────────────────────────────────
function GuardianPanel({ state }) {
  const { status = 'idle', content = '', keyPoints = [], confidence } = state || {}
  const isActive   = status === 'thinking' || status === 'streaming'
  const isComplete = status === 'complete'
  const isError    = status === 'error'

  const trustScore = confidence ? Math.round(confidence * 100) : null
  const trustColor = !trustScore ? '#8899bb'
    : trustScore >= 85 ? '#10b981'
    : trustScore >= 65 ? '#f59e0b'
    : '#f43f5e'

  return (
    <div className="flex items-start gap-4 px-4 py-3">
      {/* Icon + label */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
        <div className="relative">
          <span className="text-xl">🛡️</span>
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-400 agent-ping"/>
          )}
        </div>
        <span className="text-[8px] font-display font-700 text-rose-400 tracking-wider">GUARDIAN</span>
        <span className="text-[7px] text-[var(--text-secondary)] text-center leading-tight">Trust Audit</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!content && status === 'idle' && (
          <p className="text-[10px] text-[var(--border)] italic pt-1">
            Waiting to audit agent outputs for injection, hallucinations, and policy violations...
          </p>
        )}

        {isActive && !content && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full bg-rose-400"
                  animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-[10px] text-rose-400/70">Running Veea Lobster Trap + deep semantic audit...</span>
          </div>
        )}

        {content && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* Left: key points */}
            <div className="xl:col-span-2">
              {keyPoints.length > 0 ? (
                <ul className="space-y-0.5">
                  {keyPoints.map((pt, i) => (
                    <li key={i} className="text-[10px] text-[var(--text-secondary)] flex items-start gap-1.5">
                      <span className="text-rose-400 flex-shrink-0">›</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {content.slice(0, 180)}
                </p>
              )}
            </div>

            {/* Right: trust score gauge */}
            {isComplete && trustScore && (
              <div className="flex flex-col items-center justify-center gap-1 bg-nexus-surface rounded-lg px-3 py-2">
                <span className="text-[8px] text-[var(--text-secondary)] tracking-widest uppercase">Trust Score</span>
                <span className="text-2xl font-display font-800" style={{ color: trustColor }}>
                  {trustScore}%
                </span>
                <div className="w-full h-1 bg-nexus-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${trustScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: trustColor }}
                  />
                </div>
                <span
                  className="text-[8px] font-display font-600"
                  style={{ color: trustColor }}
                >
                  {trustScore >= 85 ? '✅ CLEARED' : trustScore >= 65 ? '⚠️ REVIEW' : '⛔ FLAGGED'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Veea badge */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-[var(--border)]">🦞 Veea Lobster Trap</span>
          <span className="text-[var(--border)] text-[7px]">·</span>
          <span className="text-[7px] font-mono text-[var(--border)]">Gemini 2.5 Flash</span>
        </div>
      </div>
    </div>
  )
}

// ── Orchestrator inline panel ──────────────────────────────────────
function OrchestratorPanel({ state }) {
  const { status = 'idle', content = '', confidence } = state || {}
  const isActive   = status === 'thinking' || status === 'streaming'
  const isComplete = status === 'complete'

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎭</span>
          <div>
            <h2 className="text-sm font-display font-700 text-indigo-400 tracking-wide">
              Orchestrator
              <span className="ml-2 text-[9px] font-mono text-indigo-400/50">NEXUS CORE</span>
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)]">
              Synthesis & Decision · Gemini 2.5 Flash
            </p>
          </div>
        </div>

        {isActive && (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-indigo-400"
                  animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-[10px] text-indigo-300">Synthesizing trusted intelligence...</span>
          </div>
        )}

        {isComplete && confidence && (
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-1">
            <span className="text-[10px] text-indigo-300">Confidence</span>
            <span className="text-sm font-display font-700 text-indigo-400">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto nexus-scroll">
        {!content && status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <span className="text-2xl">🎭</span>
            <p className="text-xs text-[var(--text-secondary)] text-center max-w-xs">
              Awaiting Guardian clearance before synthesizing executive brief.
            </p>
          </div>
        )}

        {content && (
          <div className={`text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap ${isActive ? 'typing-cursor' : ''}`}>
            {content.split('\n').map((line, i) => {
              if (line.startsWith('## ') || line.startsWith('### ')) {
                return (
                  <div key={i} className="mt-3 mb-1 text-white/80 font-display font-600 text-xs tracking-wide border-l-2 border-indigo-500/50 pl-2">
                    {line.replace(/^#+\s/, '')}
                  </div>
                )
              }
              return <span key={i}>{line}<br/></span>
            })}
          </div>
        )}
      </div>
    </div>
  )
}
