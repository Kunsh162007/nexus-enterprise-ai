import React, { useEffect, useRef } from 'react'

const AGENT_COLORS = ['#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#6366f1']

export default function NeuralBackground({ agentStates, sessionStatus }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particlesRef = useRef([])

  const isRunning = sessionStatus === 'running'
  const isComplete = sessionStatus === 'complete'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: 40 }, (_, i) => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        color: AGENT_COLORS[i % AGENT_COLORS.length],
        opacity: Math.random() * 0.4 + 0.1,
        pulseOffset: Math.random() * Math.PI * 2,
      }))
    }
    initParticles()

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.008

      const particles = particlesRef.current
      const speedMult = isRunning ? 2.5 : isComplete ? 1.5 : 1

      // Update positions
      particles.forEach(p => {
        p.x += p.vx * speedMult
        p.y += p.vy * speedMult
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      })

      // Draw connections
      const maxDist = isRunning ? 180 : 130
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12 * (isRunning ? 1.8 : 1)
            const grad = ctx.createLinearGradient(
              particles[i].x, particles[i].y,
              particles[j].x, particles[j].y
            )
            grad.addColorStop(0, hexToRgba(particles[i].color, alpha))
            grad.addColorStop(1, hexToRgba(particles[j].color, alpha))
            ctx.beginPath()
            ctx.strokeStyle = grad
            ctx.lineWidth = 0.6
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      particles.forEach((p, idx) => {
        const pulse = Math.sin(t * 2 + p.pulseOffset) * 0.3 + 0.7
        const size = p.size * (isRunning ? 1.4 : 1) * pulse
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fillStyle = hexToRgba(p.color, p.opacity * pulse)
        ctx.fill()
      })

      // Ambient glow orbs
      const orbs = [
        { x: canvas.width * 0.15, y: canvas.height * 0.3, color: '#6366f1', r: 200 },
        { x: canvas.width * 0.85, y: canvas.height * 0.7, color: '#10b981', r: 150 },
        { x: canvas.width * 0.5, y: canvas.height * 0.1, color: '#f59e0b', r: 120 },
      ]
      orbs.forEach(orb => {
        const grd = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r)
        const intensity = isRunning ? 0.06 : 0.025
        grd.addColorStop(0, hexToRgba(orb.color, intensity))
        grd.addColorStop(1, hexToRgba(orb.color, 0))
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
        ctx.fill()
      })

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isRunning, isComplete])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  )
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
