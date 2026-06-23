import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import AgentGrid from './components/AgentGrid'
import ActivityFeed from './components/ActivityFeed'
import ResultPanel from './components/ResultPanel'
import NeuralBackground from './components/NeuralBackground'
import { useNexusWebSocket } from './hooks/useNexusWebSocket'

export default function App() {
  const {
    isConnected,
    agentStates,
    sessionStatus,
    currentPhase,
    finalReport,
    activityLog,
    analyze,
    reset,
  } = useNexusWebSocket()

  const [inputText, setInputText] = useState('')
  const [view, setView] = useState('main') // 'main' | 'report'

  // Auto-switch to report view when complete
  useEffect(() => {
    if (sessionStatus === 'complete' && finalReport) {
      setView('report')
    }
  }, [sessionStatus, finalReport])

  const handleAnalyze = () => {
    if (!inputText.trim() || sessionStatus === 'running') return
    setView('main')
    analyze(inputText.trim())
  }

  const handleReset = () => {
    reset()
    setView('main')
    setInputText('')
  }

  const DEMO_SCENARIOS = [
    "Our largest client ($2M ARR) just sent a termination notice citing slow support response times. We have 30 days before contract end.",
    "Our cloud costs jumped 340% this month due to an engineering incident. Board meeting is in 72 hours.",
    "We've been approached by a Series B competitor for an acqui-hire: 40 engineers, $8M ARR, asking $45M.",
  ]

  return (
    <div className="relative h-screen w-screen overflow-hidden grid-bg bg-nexus-bg">
      <NeuralBackground agentStates={agentStates} sessionStatus={sessionStatus} />

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <Header isConnected={isConnected} sessionStatus={sessionStatus} currentPhase={currentPhase} />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row gap-0">

          {/* Left Panel: Input + Agents */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4 min-w-0 min-h-[70vh] lg:min-h-0">
            
            {/* Input Panel */}
            <InputPanel
              inputText={inputText}
              setInputText={setInputText}
              onAnalyze={handleAnalyze}
              onReset={handleReset}
              sessionStatus={sessionStatus}
              demoScenarios={DEMO_SCENARIOS}
            />

            {/* Agent Grid */}
            <div className="flex-1 overflow-hidden">
              <AgentGrid
                agentStates={agentStates}
                sessionStatus={sessionStatus}
                currentPhase={currentPhase}
              />
            </div>
          </div>

          {/* Right Panel: Activity + Report */}
          <div className="w-full lg:w-80 flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-nexus-border overflow-hidden min-h-[60vh] lg:min-h-0">
            
            {/* Tab Toggle */}
            <div className="flex border-b border-nexus-border">
              <button
                onClick={() => setView('main')}
                className={`flex-1 py-2 text-xs font-display font-semibold tracking-widest uppercase transition-colors ${
                  view === 'main'
                    ? 'text-nexus-orchestrator border-b-2 border-nexus-orchestrator bg-nexus-surface'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setView('report')}
                disabled={!finalReport}
                className={`flex-1 py-2 text-xs font-display font-semibold tracking-widest uppercase transition-colors ${
                  view === 'report'
                    ? 'text-nexus-orchestrator border-b-2 border-nexus-orchestrator bg-nexus-surface'
                    : finalReport
                    ? 'text-[var(--text-secondary)] hover:text-white'
                    : 'text-[var(--border)] cursor-not-allowed'
                }`}
              >
                Report {finalReport && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-nexus-scout inline-block" />}
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {view === 'main' ? (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <ActivityFeed log={activityLog} agentStates={agentStates} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="report"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <ResultPanel report={finalReport} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
