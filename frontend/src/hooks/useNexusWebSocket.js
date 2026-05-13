import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export function useNexusWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [agentStates, setAgentStates] = useState({
    Scout: { status: 'idle', content: '', keyPoints: [], title: '' },
    Guardian: { status: 'idle', content: '', keyPoints: [], title: '' },
    Analyst: { status: 'idle', content: '', keyPoints: [], title: '' },
    Strategist: { status: 'idle', content: '', keyPoints: [], title: '' },
    Communicator: { status: 'idle', content: '', keyPoints: [], title: '' },
    Orchestrator: { status: 'idle', content: '', keyPoints: [], title: '' },
  })
  const [sessionStatus, setSessionStatus] = useState('idle') // idle | running | complete | error
  const [currentPhase, setCurrentPhase] = useState(null)
  const [finalReport, setFinalReport] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [sessionId, setSessionId] = useState(null)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  const addActivity = useCallback((message, type = 'info', agent = null) => {
    setActivityLog(prev => [
      { id: Date.now() + Math.random(), message, type, agent, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49),
    ])
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      addActivity('NEXUS systems online', 'system')
      // Start ping interval
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        } else {
          clearInterval(ping)
        }
      }, 30000)
    }

    ws.onclose = () => {
      setIsConnected(false)
      addActivity('Connection lost — reconnecting...', 'warning')
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      addActivity('WebSocket error', 'error')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch (e) {
        console.error('Failed to parse WS message', e)
      }
    }
  }, [addActivity])

  const handleMessage = useCallback((msg) => {
    const { type, agent, content, data, session_id, report, phase, label, agents: phaseAgents } = msg

    switch (type) {
      case 'pong':
        break

      case 'session_start':
        setSessionStatus('running')
        setFinalReport(null)
        setSessionId(session_id)
        addActivity(`Analysis started: "${content || msg.input?.slice(0, 60)}..."`, 'system')
        // Reset all agents
        setAgentStates(prev => Object.fromEntries(
          Object.keys(prev).map(k => [k, { status: 'idle', content: '', keyPoints: [], title: '' }])
        ))
        break

      case 'phase':
        setCurrentPhase({ phase, label, agents: phaseAgents })
        addActivity(`Phase ${phase}: ${label}`, 'phase')
        if (phaseAgents) phaseAgents.forEach(a => { if (!agentStates[a]) return })
        break

      case 'agent_thinking':
        if (agent) {
          setAgentStates(prev => ({
            ...prev,
            [agent]: { ...prev[agent], status: 'thinking', content: content || '' }
          }))
          addActivity(`${agent} is analyzing...`, 'thinking', agent)
        }
        break

      case 'agent_stream':
        if (agent) {
          setAgentStates(prev => ({
            ...prev,
            [agent]: {
              ...prev[agent],
              status: 'streaming',
              content: (prev[agent]?.content || '') + (content || '')
            }
          }))
        }
        break

      case 'agent_complete':
        if (agent) {
          setAgentStates(prev => ({
            ...prev,
            [agent]: {
              ...prev[agent],
              status: 'complete',
              content: content || prev[agent]?.content || '',
              keyPoints: data?.key_points || [],
              title: data?.title || agent,
              confidence: data?.confidence,
            }
          }))
          addActivity(`${agent} complete`, 'complete', agent)
        }
        break

      case 'agent_error':
        if (agent) {
          setAgentStates(prev => ({
            ...prev,
            [agent]: { ...prev[agent], status: 'error', content: content || 'Error occurred' }
          }))
          addActivity(`${agent} encountered an error`, 'error', agent)
        }
        break

            case 'trust_warning':
        addActivity('⛔ Guardian flagged critical trust violations', 'error', 'Guardian')
        break

      case 'session_complete':
        setSessionStatus('complete')
        setFinalReport(report)
        addActivity(`Analysis complete in ${(report?.processing_time_ms / 1000).toFixed(1)}s`, 'system')
        break

      case 'session_error':
        setSessionStatus('error')
        addActivity(`Session error: ${msg.error}`, 'error')
        break
    }
  }, [addActivity])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const analyze = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addActivity('Not connected — retrying...', 'warning')
      connect()
      return
    }
    const sid = `session_${Date.now()}`
    wsRef.current.send(JSON.stringify({
      type: 'analyze',
      text,
      session_id: sid,
    }))
  }, [connect, addActivity])

  const reset = useCallback(() => {
    setSessionStatus('idle')
    setFinalReport(null)
    setCurrentPhase(null)
    setAgentStates(prev => Object.fromEntries(
      Object.keys(prev).map(k => [k, { status: 'idle', content: '', keyPoints: [], title: '' }])
    ))
    addActivity('Session cleared', 'system')
  }, [addActivity])

  return {
    isConnected,
    agentStates,
    sessionStatus,
    currentPhase,
    finalReport,
    activityLog,
    sessionId,
    analyze,
    reset,
  }
}
