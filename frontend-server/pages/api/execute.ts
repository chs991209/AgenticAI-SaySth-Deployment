import type { NextApiRequest, NextApiResponse } from 'next'
import { env } from '../../lib/env'
import { registerPendingRequest } from './execute-voice-callback'
import { setCorsHeaders, handleCorsPreflight } from '../../lib/cors'

interface ExecuteRequest {
  prompt?: string // 텍스트 명령용
  audio?: string // 음성 명령용 (base64 encoded)
  type?: 'text' | 'voice' // 요청 타입 구분
}

interface Action {
  [key: string]: string[]
}

interface ExecuteResponse {
  actions_list?: Action[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExecuteResponse>
) {
  // CORS preflight 요청 처리
  if (handleCorsPreflight(req, res)) {
    return
  }

  // CORS 헤더 설정
  setCorsHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, audio, type } = req.body

  // 요청 타입 자동 감지 또는 명시적 타입 사용
  const requestType = type || (audio ? 'voice' : 'text')

  // 요청 타입별 유효성 검사
  if (requestType === 'text') {
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required for text requests' })
    }
  } else if (requestType === 'voice') {
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required for voice requests' })
    }
  } else {
    return res.status(400).json({ error: 'Invalid request type. Must be "text" or "voice"' })
  }

  console.log(`[execute] Request type: ${requestType}`)

  try {
    const AGENTIC_AI_SERVER_URL = env.AGENTIC_AI_SERVER_URL

    if (requestType === 'text') {
      // 텍스트 명령: Agent server로 직접 전송
      const response = await fetch(`${AGENTIC_AI_SERVER_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return res.status(response.status).json({
          error: errorData.error || `HTTP error! status: ${response.status}`,
        })
      }

      const data = await response.json()
      return res.status(200).json(data)
    } else {
      // 음성 명령: STT server로 음성 데이터 전송
      const STT_SERVER_URL = env.STT_SERVER_URL || 'http://localhost:8003'
      const FRONTEND_SERVER_URL = env.FRONTEND_SERVER_URL
      const callbackUrl = `${FRONTEND_SERVER_URL}/execute-voice-callback`

      // 요청 ID 생성 (callback 매칭용)
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const callbackUrlWithId = `${callbackUrl}?request_id=${requestId}`

      console.log(`[execute] Sending audio to STT server: ${STT_SERVER_URL}`)
      console.log(`[execute] Callback URL for Agent server: ${callbackUrlWithId}`)
      console.log(`[execute] Request ID: ${requestId}`)
      
      // Promise를 사용하여 Agent server의 callback 응답을 기다림
      const agentResponsePromise = new Promise<{ actions_list?: Action[]; error?: string }>((resolve, reject) => {
        registerPendingRequest(resolve, reject, 30000, requestId) // 30초 타임아웃, request_id 전달
      })

      // 1. STT server로 음성 데이터 전송
      const sttResponse = await fetch(`${STT_SERVER_URL}/stt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: audio,
          agent_server_url: AGENTIC_AI_SERVER_URL,
          callback_url: callbackUrlWithId
        }),
      })

      if (!sttResponse.ok) {
        const errorText = await sttResponse.text()
        console.error('[execute] STT server error:', errorText)
        return res.status(sttResponse.status).json({
          error: `STT server error: ${sttResponse.status}`,
        })
      }

      const sttResult = await sttResponse.json()
      console.log(`[execute] STT server response:`, sttResult)
      
      // STT 서버는 항상 Agentic AI 서버로 요청을 보내야 하므로,
      // 프론트엔드는 Agentic AI 서버의 callback만 기다립니다.
      // STT 서버가 텍스트만 반환하는 경우는 더 이상 지원하지 않습니다.
      console.log('[execute] Waiting for Agent server callback...')
      const agentResult = await agentResponsePromise
      
      if (agentResult.error) {
        return res.status(500).json({ error: agentResult.error })
      }
      
      console.log('[execute] Successfully received callback from Agent server')
      return res.status(200).json(agentResult)
    }
  } catch (error) {
    console.error('Error in execute API:', error)
    if (error instanceof Error && error.message.includes('Environment variable')) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to process request',
    })
  }
}
