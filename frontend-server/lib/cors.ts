import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * CORS 헤더를 설정하는 헬퍼 함수
 * 원격 호스트 간 통신을 허용합니다.
 */
export function setCorsHeaders(res: NextApiResponse) {
  // 모든 origin 허용 (프로덕션에서는 특정 도메인만 허용하도록 수정 권장)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400') // 24시간
}

/**
 * OPTIONS 요청(Preflight)을 처리하는 헬퍼 함수
 */
export function handleCorsPreflight(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res)
    res.status(200).end()
    return true
  }
  return false
}

