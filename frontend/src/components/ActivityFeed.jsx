import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const AGENT_COLORS = {
  Scout: '#10b981', Analyst: '#f59e0b', Strategist: '#ec4899',
  Communicator: '#3b82f6', Orchestrator: '#6366f1',
}

const TYPE_STYLES = {
  system:   { bg: 'bg-nexus-surface', text: 'text-[var(--text-secondary)]', dot: 'bg-indigo-400', label: 'SYS' },
  phase:    { bg: 'bg-indigo-500/10', text: 'text-indigo-300', dot: 'bg-indigo-400', label: 'PHS' },
  thinking: { bg: 'bg-nexus-surface', text: 'text-[var(--text-secondary)]', dot: 'bg-yellow-400', label: 'ACT' },
  complete: { bg: 'bg-emerald-500/5',  text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'OK' },
  error:    { bg: 'bg-red-500/10',    text: 'text-red-400', dot: 'bg-red-400', label: 'ERR' },
  warning:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400', label: 'WRN' },
  info:     { bg: 'bg-nexus-surface', text: 'text-[var(--text-secondary)]', dot: 'bg-blue-400', label: 'INF' },
}

export default function ActivityFeed({ log, agentStates }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const activeAgents = Object.entries(agentStates || {}).filter(
    ([, s]) => s.status === 'thinking' || s.status === 'streaming'
  )

  return (
    <div className="h-full flex flex-col bg-nexus-surface/30">
      {/* Active agents indicator */}
      {activeAgents.length > 0 && (
        <div className="px-3 py-2 border-b border-nexus-border flex flex-wrap gap-1.5">
          {activeAgents.map(([name]) => (
            <div
              key={name}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono"
              style={{
                background: `${AGENT_COLORS[name]}15`,
                border: `1px solid ${AGENT_COLORS[name]}40`,
                color: AGENT_COLORS[name],
              }}
            >
              <span
                className="w-1 h-1 rounded-full animate-pulse"
                style={{ background: AGENT_COLORS[name] }}
              />
              {name}
            </div>
          ))}
        </div>
      )}

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto nexus-scroll px-3 py-2 space-y-1 flex flex-col-reverse">
        <div ref={bottomRef} />
        <AnimatePresence initial={false}>
          {[...log].reverse().map((entry) => {
            const style = TYPE_STYLES[entry.type] || TYPE_STYLES.info
            const agentColor = entry.agent ? AGENT_COLORS[entry.agent] : null

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`rounded-lg px-2.5 py-2 ${style.bg}`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${
                      agentColor ? '' : style.dot
                    }`}
                    style={agentColor ? { background: agentColor } : {}}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] leading-relaxed ${style.text}`}>
                      {entry.message}
                    </p>
                    <p className="text-[8px] text-[var(--border)] font-mono mt-0.5">
                      {entry.time}
                    </p>
                  </div>
                  <span className={`text-[7px] font-mono tracking-widest flex-shrink-0 ${style.text} opacity-50`}>
                    {style.label}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {log.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-30">
            <div className="w-6 h-6 rounded-full border border-nexus-border flex items-center justify-center">
              <span className="text-xs">◎</span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]">Awaiting activity...</p>
          </div>
        )}
      </div>
    </div>
  )
}
