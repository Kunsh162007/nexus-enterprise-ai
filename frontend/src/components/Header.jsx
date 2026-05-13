import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Radio, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

const PHASE_COLORS = {
  '1': 'text-nexus-scout',
  '2': 'text-nexus-analyst',
  '3': 'text-nexus-orchestrator',
}

export default function Header({ isConnected, sessionStatus, currentPhase }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-nexus-border bg-nexus-surface/60 backdrop-blur-sm">
      
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-nexus-orchestrator/20 border border-nexus-orchestrator/40 flex items-center justify-center">
            <Cpu size={16} className="text-nexus-orchestrator" />
          </div>
          {sessionStatus === 'running' && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nexus-scout agent-ping" />
          )}
        </div>
        <div>
          <h1 className="font-display font-800 text-lg tracking-wider text-white leading-none">
            NEX<span className="gradient-text">US</span>
          </h1>
          <p className="text-[9px] tracking-[0.3em] text-[var(--text-secondary)] uppercase">
            Enterprise AI Command Center
          </p>
        </div>
      </div>

      {/* Phase Indicator */}
      <AnimatePresence mode="wait">
        {currentPhase && sessionStatus === 'running' && (
          <motion.div
            key={currentPhase.phase}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-nexus-card border border-nexus-border"
          >
            <Loader2 size={12} className={`animate-spin ${PHASE_COLORS[currentPhase.phase]}`} />
            <span className={`text-xs font-display font-semibold tracking-wide ${PHASE_COLORS[currentPhase.phase]}`}>
              Phase {currentPhase.phase}:
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{currentPhase.label}</span>
          </motion.div>
        )}
        {sessionStatus === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-nexus-scout/10 border border-nexus-scout/30"
          >
            <CheckCircle2 size={12} className="text-nexus-scout" />
            <span className="text-xs font-display font-semibold text-nexus-scout tracking-wide">
              Analysis Complete
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span className="font-mono">5 Agents Active</span>
          <span>·</span>
          <span className="font-mono">Gemini + Featherless</span>
          <span>·</span>
          <span className="font-mono">Speechmatics Voice</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
          isConnected
            ? 'text-nexus-scout border-nexus-scout/30 bg-nexus-scout/10'
            : 'text-red-400 border-red-400/30 bg-red-400/10'
        }`}>
          <Radio size={10} className={isConnected ? 'text-nexus-scout' : 'text-red-400'} />
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>
    </header>
  )
}
