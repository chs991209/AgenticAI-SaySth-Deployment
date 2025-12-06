import type { NextApiRequest, NextApiResponse } from 'next'
import { env } from '../../lib/env'
import { URL } from 'url'
import { setCorsHeaders, handleCorsPreflight } from '../../lib/cors'

/**
 * Agent server가 음성 명령 처리 후 응답을 보내는 callback 엔드포인트
 * 이 엔드포인트는 Agent server에서만 호출되어야 합니다.
 * 
 * 주의: 이 엔드포인트는 내부적으로만 사용되며, 클라이언트가 직접 호출하지 않습니다.
 * STT server가 Agent server로 요청을 보낼 때 이 URL을 callback_url로 전달합니다.
 */
interface CallbackResponse {
  success: boolean
  message?: string
}

// 요청 ID 기반으로 여러 요청을 동시에 처리할 수 있도록 Map 사용
// Next.js 개발 모드에서 모듈 리로드 시에도 안정적으로 작동
interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: any) => void
  timeout: NodeJS.Timeout
}

const pendingRequests = new Map<string, PendingRequest>()

/**
 * 요청이 Agentic AI 서버로부터 오는지 검증
 * 
 * 검증 방법:
 * 1. Referer 또는 Origin 헤더에서 Agentic AI 서버 호스트 확인
 * 2. FRONTEND_SERVER_URL의 호스트 확인 (ngrok 등 프록시 사용 시)
 * 3. X-Forwarded-For 헤더를 통한 IP 주소 확인 (선택적)
 * 4. Docker 네트워크 내부 통신 허용
 * 
 * 주의: 개발 환경에서는 localhost/127.0.0.1도 허용하되,
 * 프로덕션 환경에서는 더 엄격한 검증이 필요할 수 있습니다.
 */
function isRequestFromAgenticAIServer(req: NextApiRequest): boolean {
  try {
    const agenticAIServerUrl = new URL(env.AGENTIC_AI_SERVER_URL)
    const agenticAIHost = agenticAIServerUrl.hostname
    
    // FRONTEND_SERVER_URL의 호스트도 허용 (ngrok 등 프록시 사용 시)
    let allowedHosts = [agenticAIHost]
    try {
      const frontendServerUrl = new URL(env.FRONTEND_SERVER_URL)
      const frontendHost = frontendServerUrl.hostname
      // ngrok 도메인인 경우 (ngrok.io, ngrok-free.app 등)
      if (frontendHost.includes('ngrok') || frontendHost.includes('ngrok-free')) {
        allowedHosts.push(frontendHost)
      }
    } catch (e) {
      // FRONTEND_SERVER_URL 파싱 실패 시 무시
    }
    
    // Referer 또는 Origin 헤더 확인
    const referer = req.headers.referer || req.headers.origin || ''
    
    // Referer/Origin에서 호스트 추출
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        const refererHost = refererUrl.hostname
        
        // 허용된 호스트 목록에 있는지 확인
        if (allowedHosts.includes(refererHost)) {
          return true
        }
        
        // localhost/127.0.0.1인 경우 추가 검증
        // Agentic AI 서버도 localhost인 경우 허용
        if ((refererHost === 'localhost' || refererHost === '127.0.0.1') &&
            (agenticAIHost === 'localhost' || agenticAIHost === '127.0.0.1' || agenticAIHost === 'agentic-ai-server')) {
          return true
        }
      } catch (e) {
        // URL 파싱 실패 시 무시
      }
    }
    
    // IP 주소 기반 검증 (프록시를 거치는 경우)
    const forwardedFor = req.headers['x-forwarded-for']
    const realIp = req.headers['x-real-ip']
    const remoteAddress = req.socket?.remoteAddress
    
    // Docker 네트워크 내부 통신 허용 (agentic-ai-server 호스트인 경우)
    if (agenticAIHost === 'agentic-ai-server' || agenticAIHost === 'localhost' || agenticAIHost === '127.0.0.1') {
      const ip = forwardedFor?.toString().split(',')[0].trim() || 
                 realIp?.toString() || 
                 remoteAddress
      
      // localhost 또는 Docker 네트워크 내부 IP인 경우 허용
      if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || 
          ip?.startsWith('172.') || ip?.startsWith('192.168.') || ip?.startsWith('10.')) {
        // Docker 네트워크 내부 통신 또는 localhost에서 온 요청인 경우 허용
        return true
      }
    }
    
    // ngrok을 통한 요청인 경우 (X-Forwarded-Host 헤더 확인)
    const forwardedHost = req.headers['x-forwarded-host']
    if (forwardedHost && typeof forwardedHost === 'string') {
      const forwardedHostname = forwardedHost.split(':')[0]
      if (allowedHosts.some(host => forwardedHostname.includes(host) || host.includes(forwardedHostname))) {
        return true
      }
    }
    
    console.warn(
      `[execute-voice-callback] Request origin validation failed. ` +
      `Expected hosts: ${allowedHosts.join(', ')}, ` +
      `Referer: ${referer}, ` +
      `X-Forwarded-Host: ${forwardedHost}, ` +
      `IP: ${forwardedFor || realIp || remoteAddress}`
    )
    return false
  } catch (error) {
    console.error('[execute-voice-callback] Error validating request origin:', error)
    return false
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CallbackResponse>
) {
  // CORS preflight 요청 처리
  if (handleCorsPreflight(req, res)) {
    return
  }

  // CORS 헤더 설정
  setCorsHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  // Agentic AI 서버로부터의 요청인지 검증
  if (!isRequestFromAgenticAIServer(req)) {
    console.error('[execute-voice-callback] Request rejected: Not from Agentic AI server')
    return res.status(403).json({ success: false, message: 'Forbidden: Only Agentic AI server can call this endpoint' })
  }

  // request_id는 query parameter 또는 body에서 가져오기
  const requestIdFromQuery = req.query.request_id as string | undefined
  const { request_id: requestIdFromBody, actions_list, error } = req.body
  const request_id = requestIdFromQuery || requestIdFromBody

  // request_id가 없으면 기존 방식으로 동작 (하위 호환성)
  if (!request_id) {
    console.warn('[execute-voice-callback] No request_id provided, trying to find any pending request')
    // 가장 오래된 요청 찾기 (단일 요청 처리 모드)
    const firstRequest = Array.from(pendingRequests.values())[0]
    if (!firstRequest) {
      console.warn('[execute-voice-callback] No pending request found')
      return res.status(404).json({ success: false, message: 'No pending request' })
    }
    
    // 타임아웃 제거
    clearTimeout(firstRequest.timeout)
    pendingRequests.clear()
    
    // 응답 처리
    if (error) {
      firstRequest.reject(new Error(error))
    } else {
      firstRequest.resolve({ actions_list })
    }
    
    return res.status(200).json({ success: true })
  }

  // request_id로 특정 요청 찾기
  const pendingRequest = pendingRequests.get(request_id)
  if (!pendingRequest) {
    console.warn(`[execute-voice-callback] No pending request found for request_id: ${request_id}`)
    return res.status(404).json({ success: false, message: `No pending request found for request_id: ${request_id}` })
  }

  // 타임아웃 제거
  clearTimeout(pendingRequest.timeout)
  pendingRequests.delete(request_id)

  // 응답 처리
  if (error) {
    pendingRequest.reject(new Error(error))
  } else {
    pendingRequest.resolve({ actions_list })
  }

  return res.status(200).json({ success: true })
}

// Pending 요청 등록 함수 (execute.ts에서 사용)
export function registerPendingRequest(
  resolve: (value: any) => void,
  reject: (error: any) => void,
  timeoutMs: number = 30000,
  requestId?: string
): string {
  // request_id가 제공되지 않으면 자동 생성
  const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // 기존 요청이 있으면 타임아웃 처리 (동일 request_id인 경우)
  const existingRequest = pendingRequests.get(id)
  if (existingRequest) {
    clearTimeout(existingRequest.timeout)
    existingRequest.reject(new Error('Request replaced by new request with same ID'))
  }

  // 타임아웃 설정
  const timeout = setTimeout(() => {
    pendingRequests.delete(id)
    reject(new Error('Request timeout'))
  }, timeoutMs)

  // 요청 등록
  pendingRequests.set(id, { resolve, reject, timeout })

  return id
}

