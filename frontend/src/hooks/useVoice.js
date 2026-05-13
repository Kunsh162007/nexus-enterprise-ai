import { useState, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        setIsTranscribing(true)

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1]
          try {
            const resp = await fetch(`${API_URL}/transcribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_base64: base64 }),
            })
            const data = await resp.json()
            setTranscript(data.transcript || '')
          } catch (e) {
            setError('Transcription failed')
          } finally {
            setIsTranscribing(false)
          }
        }
        reader.readAsDataURL(blob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (e) {
      setError('Microphone access denied')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const clearTranscript = useCallback(() => setTranscript(''), [])

  return {
    isRecording,
    isTranscribing,
    transcript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  }
}
