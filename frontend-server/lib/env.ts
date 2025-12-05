/**
 * Environment variables validation and access
 * 환경 변수 검증 및 접근 유틸리티
 */

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Environment variable ${name} is not set. Please check your .env.local file.`
    )
  }
  return value
}

export const env = {
  // STT Server URL (음성 명령 처리용)
  STT_SERVER_URL: process.env.STT_SERVER_URL || 'http://localhost:8003',
  // Agentic AI Server URL (필수)
  AGENTIC_AI_SERVER_URL: getEnvVar('AGENTIC_AI_SERVER_URL'),
  // Frontend server URL (callback URL용)
  // 환경 변수가 없으면 localhost:3000 사용
  FRONTEND_SERVER_URL: process.env.FRONTEND_SERVER_URL || 'http://localhost:3000',
}

// 서버 시작 시 환경 변수 검증
if (typeof window === 'undefined') {
  // 서버 사이드에서만 실행
  try {
    // 모든 환경 변수가 설정되어 있는지 확인
    Object.values(env)
    console.log('[Env] All environment variables loaded successfully')
  } catch (error) {
    console.error('[Env] Environment variable validation failed:', error)
    // 서버 시작은 계속하되, API 호출 시 에러 반환
  }
}

