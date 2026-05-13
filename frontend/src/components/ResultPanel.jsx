import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckSquare, AlertTriangle, TrendingUp, Clock, Download,
  ChevronDown, ChevronUp, Zap
} from 'lucide-react'

export default function ResultPanel({ report }) {
  const [expandedSection, setExpandedSection] = useState('actions')

  if (!report) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 opacity-30">
        <div className="w-10 h-10 rounded-full border border-indigo-500/30 flex items-center justify-center">
          <span className="text-xl">🎭</span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] text-center leading-relaxed">
          Run an analysis to generate the executive brief
        </p>
      </div>
    )
  }

  const confidence = Math.round((report.decision_confidence || 0.82) * 100)
  const elapsed = ((report.processing_time_ms || 0) / 1000).toFixed(1)

  const toggle = (key) => setExpandedSection(expandedSection === key ? null : key)

  return (
    <div className="h-full overflow-y-auto nexus-scroll bg-nexus-surface/20">
      {/* Top Stats */}
      <div className="px-4 py-3 border-b border-nexus-border grid grid-cols-2 gap-3">
        <StatBox
          icon={<Zap size={12} className="text-indigo-400" />}
          label="Confidence"
          value={`${confidence}%`}
          color="text-indigo-400"
          barFill={confidence}
          barColor="#6366f1"
        />
        <StatBox
          icon={<Clock size={12} className="text-emerald-400" />}
          label="Analysis Time"
          value={`${elapsed}s`}
          color="text-emerald-400"
        />
      </div>

      {/* Executive Summary */}
      {report.executive_summary && (
        <div className="px-4 py-3 border-b border-nexus-border">
          <p className="text-[10px] text-[var(--text-secondary)] font-display font-600 tracking-widest uppercase mb-2">
            Executive Summary
          </p>
          <p className="text-[11px] text-white/80 leading-relaxed">
            {report.executive_summary}
          </p>
        </div>
      )}

      {/* Action Items */}
      <Accordion
        id="actions"
        expanded={expandedSection === 'actions'}
        onToggle={() => toggle('actions')}
        icon={<CheckSquare size={12} className="text-emerald-400" />}
        title="Action Items"
        count={report.action_items?.length}
        countColor="text-emerald-400"
      >
        <ol className="space-y-2">
          {(report.action_items || []).map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2.5"
            >
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[8px] font-mono text-emerald-400 mt-0.5">
                {i + 1}
              </span>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{item}</p>
            </motion.li>
          ))}
        </ol>
      </Accordion>

      {/* Risk Flags */}
      {report.risk_flags?.length > 0 && (
        <Accordion
          id="risks"
          expanded={expandedSection === 'risks'}
          onToggle={() => toggle('risks')}
          icon={<AlertTriangle size={12} className="text-red-400" />}
          title="Risk Alerts"
          count={report.risk_flags?.length}
          countColor="text-red-400"
        >
          <ul className="space-y-1.5">
            {report.risk_flags.map((risk, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 flex-shrink-0 mt-0.5 text-[10px]">🔴</span>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{risk}</p>
              </li>
            ))}
          </ul>
        </Accordion>
      )}

      {/* Opportunities */}
      {report.opportunity_flags?.length > 0 && (
        <Accordion
          id="opps"
          expanded={expandedSection === 'opps'}
          onToggle={() => toggle('opps')}
          icon={<TrendingUp size={12} className="text-emerald-400" />}
          title="Opportunities"
          count={report.opportunity_flags?.length}
          countColor="text-emerald-400"
        >
          <ul className="space-y-1.5">
            {report.opportunity_flags.map((opp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 flex-shrink-0 mt-0.5 text-[10px]">🟢</span>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{opp}</p>
              </li>
            ))}
          </ul>
        </Accordion>
      )}

      {/* Agent Contributions */}
      {report.agent_results?.length > 0 && (
        <Accordion
          id="agents"
          expanded={expandedSection === 'agents'}
          onToggle={() => toggle('agents')}
          icon={<span className="text-[10px]">🤝</span>}
          title="Agent Contributions"
          count={report.agent_results?.length}
          countColor="text-indigo-400"
        >
          <div className="space-y-2">
            {report.agent_results.map((ar, i) => (
              <div key={i} className="bg-nexus-card rounded-lg p-2.5 border border-nexus-border">
                <p className="text-[10px] font-display font-600 text-white/70 mb-1">{ar.agent}: {ar.title}</p>
                <ul className="space-y-0.5">
                  {(ar.key_points || []).slice(0, 2).map((pt, j) => (
                    <li key={j} className="text-[9px] text-[var(--text-secondary)] flex items-start gap-1">
                      <span className="text-indigo-400 flex-shrink-0">›</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Export Button */}
      <div className="px-4 py-3">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `nexus-report-${report.session_id?.slice(-8) || 'export'}.json`
            a.click()
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-display font-600 hover:bg-indigo-500/20 transition-colors"
        >
          <Download size={12} />
          Export Report
        </button>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, color, barFill, barColor }) {
  return (
    <div className="bg-nexus-card rounded-lg p-2.5 border border-nexus-border">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9px] text-[var(--text-secondary)] tracking-wide uppercase">{label}</span>
      </div>
      <p className={`text-base font-display font-700 ${color}`}>{value}</p>
      {barFill !== undefined && (
        <div className="mt-1.5 h-0.5 bg-nexus-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barFill}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: barColor }}
          />
        </div>
      )}
    </div>
  )
}

function Accordion({ id, expanded, onToggle, icon, title, count, countColor, children }) {
  return (
    <div className="border-b border-nexus-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-nexus-surface/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-display font-600 tracking-widest uppercase text-white/70">{title}</span>
          {count > 0 && (
            <span className={`text-[9px] font-mono ${countColor}`}>({count})</span>
          )}
        </div>
        {expanded ? <ChevronUp size={10} className="text-[var(--text-secondary)]" /> : <ChevronDown size={10} className="text-[var(--text-secondary)]" />}
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-3"
        >
          {children}
        </motion.div>
      )}
    </div>
  )
}

// ── TrustPanel component (append to ResultPanel.jsx) ──────────────
export function TrustPanel({ trustReport }) {
  if (!trustReport || !trustReport.overall_trust_score) return null

  const score = Math.round(trustReport.overall_trust_score * 100)
  const color = score >= 85 ? '#10b981' : score >= 65 ? '#f59e0b' : '#f43f5e'
  const flags = trustReport.flags || []
  const sevIcons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪' }

  return (
    <div className="border-b border-nexus-border">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🛡️</span>
            <span className="text-[10px] font-display font-600 tracking-widest uppercase text-rose-400">
              Guardian Trust Report
            </span>
          </div>
          <span className="text-lg font-display font-800" style={{ color }}>{score}%</span>
        </div>

        <div className="h-1 bg-nexus-border rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
        </div>

        <p className="text-[9px] text-[var(--text-secondary)] mb-2">{trustReport.audit_summary}</p>

        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {[
            { label: 'Injections', val: trustReport.injection_attempts || 0, warn: true },
            { label: 'Hallucinations', val: trustReport.hallucinations_detected || 0, warn: true },
            { label: 'Violations', val: trustReport.policy_violations || 0, warn: true },
          ].map(s => (
            <div key={s.label} className="bg-nexus-surface rounded p-1.5 text-center">
              <p className={`text-sm font-display font-700 ${s.val > 0 && s.warn ? 'text-amber-400' : 'text-emerald-400'}`}>
                {s.val}
              </p>
              <p className="text-[7px] text-[var(--text-secondary)]">{s.label}</p>
            </div>
          ))}
        </div>

        {flags.length > 0 && (
          <div className="space-y-1">
            {flags.slice(0, 3).map((f, i) => (
              <div key={i} className="text-[9px] text-[var(--text-secondary)] flex items-start gap-1.5">
                <span>{sevIcons[f.severity] || '⚪'}</span>
                <span><strong className="text-white/70">{f.agent}</strong>: {f.description}</span>
              </div>
            ))}
          </div>
        )}

        {flags.length === 0 && (
          <p className="text-[9px] text-emerald-400">✅ All agent outputs verified — no flags raised</p>
        )}

        <p className="text-[7px] text-[var(--border)] mt-1.5">🦞 Powered by Veea Lobster Trap</p>
      </div>
    </div>
  )
}
