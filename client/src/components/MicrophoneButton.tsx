import React, { useState, useRef, useEffect } from 'react'
import { sendAudioToASR } from '../api'

interface MicrophoneButtonProps {
  onTranscript: (text: string) => void
  onVoiceCommand?: (text: string) => Promise<void>
  disabled?: boolean
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  onTranscript,
  onVoiceCommand,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      // Cleanup: stop recording if component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('마이크 접근 권한이 필요합니다.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      const text = await sendAudioToASR(audioBlob)
      if (text) {
        onTranscript(text)
        // 음성 명령인 경우 자동으로 실행
        if (onVoiceCommand) {
          await onVoiceCommand(text)
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      alert('음성 인식 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClick = () => {
    if (disabled || isProcessing) return

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`microphone-button ${isRecording ? 'recording' : ''} ${
        isProcessing ? 'processing' : ''
      }`}
      title={isRecording ? '녹음 중지' : isProcessing ? '처리 중...' : '음성 입력 시작'}
    >
      {isProcessing ? (
        <span className="spinner">⏳</span>
      ) : isRecording ? (
        <span className="recording-indicator">🔴</span>
      ) : (
        <span>🎤</span>
      )}
    </button>
  )
}

export default MicrophoneButton

