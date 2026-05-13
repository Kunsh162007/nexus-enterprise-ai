import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff, Zap, RotateCcw, ChevronDown, Loader2 } from 'lucide-react'
import { useVoiceInput } from '../hooks/useVoice'

export default function InputPanel({
  inputText, setInputText, onAnalyze, onReset, sessionStatus, demoScenarios
}) {
  const [showDemos, setShowDemos] = useState(false)
  const { isRecording, isTranscribing, transcript, startRecording, stopRecording } = useVoiceInput()
  const isRunning = sessionStatus === 'running'

  // Set voice transcript into input
  React.useEffect(() => {
    if (transcript) setInputText(transcript)
  }, [transcript, setInputText])

  const handleVoiceToggle = () => {
    if (isRecording) stopRecording()
    else startRecording()
  }

  return (
    <div className="bg-nexus-card border border-nexus-border rounded-xl overflow-hidden">
      {/* Input Row */}
      <div className="flex items-start gap-0">
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onAnalyze()
          }}
          placeholder="Describe your enterprise challenge... (e.g., 'Our largest client is leaving. We have 30 days.')"
          disabled={isRunning}
          rows={2}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--text-secondary)] resize-none p-4 focus:outline-none font-body leading-relaxed disabled:opacity-50"
        />
        <div className="flex flex-col gap-0 p-2">
          {/* Voice Button */}
          <button
            onClick={handleVoiceToggle}
            disabled={isRunning || isTranscribing}
            className={`p-2 rounded-lg transition-all ${
              isRecording
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                : isTranscribing
                ? 'bg-nexus-analyst/20 text-nexus-analyst'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-nexus-surface'
            }`}
            title={isRecording ? 'Stop recording' : 'Voice input (Speechmatics)'}
          >
            {isTranscribing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isRecording ? (
              <MicOff size={16} />
            ) : (
              <Mic size={16} />
            )}
          </button>

          {/* Analyze Button */}
          <button
            onClick={onAnalyze}
            disabled={!inputText.trim() || isRunning}
            className="p-2 rounded-lg bg-nexus-orchestrator text-white hover:bg-nexus-orchestrator/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Analyze (Ctrl+Enter)"
          >
            {isRunning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-nexus-border bg-nexus-surface/30">
        <div className="flex items-center gap-3">
          {/* Demo Scenarios */}
          <div className="relative">
            <button
              onClick={() => setShowDemos(!showDemos)}
              disabled={isRunning}
              className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-nexus-analyst transition-colors disabled:opacity-40"
            >
              <Zap size={11} />
              <span>Demo scenarios</span>
              <ChevronDown size={11} className={`transition-transform ${showDemos ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showDemos && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute bottom-full left-0 mb-2 w-96 bg-nexus-card border border-nexus-border rounded-xl overflow-hidden shadow-2xl z-50"
                >
                  {demoScenarios.map((scenario, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputText(scenario)
                        setShowDemos(false)
                      }}
                      className="w-full text-left px-4 py-3 text-xs text-[var(--text-secondary)] hover:bg-nexus-surface hover:text-white transition-colors border-b border-nexus-border/50 last:border-0 leading-relaxed"
                    >
                      <span className="text-nexus-analyst font-mono mr-2">{i + 1}.</span>
                      {scenario.slice(0, 100)}...
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isRecording && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Recording...
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--border)] font-mono">⌘↵ to run</span>
          {(sessionStatus === 'complete' || sessionStatus === 'error') && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-nexus-analyst transition-colors"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
