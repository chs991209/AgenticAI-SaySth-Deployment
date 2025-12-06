/**
 * Environment variables validation and access
 * 환경 변수 검증 및 접근 유틸리티
 */

// Next.js에서는 process.env[name] 동적 접근보다 직접 접근을 권장합니다.
// 아래와 같이 값을 직접 가져온 후 검증하는 헬퍼 함수를 사용합니다.
function validateVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Environment variable ${name} is not set. Please check your .env.local file or Docker environment variables.`
    )
  }
  return value
}

export const env = {
  // STT Server URL (음성 명령 처리용)
  // Docker 내부에서는 localhost가 아닌 host.docker.internal을 써야 하므로,
  // 실수로 env가 없을 때 localhost로 빠지는 것보다 명시적으로 체크하는 것이 안전할 수 있습니다.
  // 다만, 로컬 개발 편의를 위해 localhost를 남겨둔다면, Docker 실행 시엔 반드시 env를 주입해야 합니다.
  STT_SERVER_URL: process.env.STT_SERVER_URL || 'http://localhost:8003',

  // Agentic AI Server URL (필수)
  // 동적 접근(process.env[name]) 대신 직접 접근(process.env.AGENTIC_...) 사용
  AGENTIC_AI_SERVER_URL: validateVar(
    'AGENTIC_AI_SERVER_URL',
    process.env.AGENTIC_AI_SERVER_URL
  ),

  // Frontend server URL (callback URL용)
  // Agent Server가 이 주소로 콜백을 보냅니다.
  FRONTEND_SERVER_URL: process.env.FRONTEND_SERVER_URL || 'http://localhost:3000',
}

// 서버 시작 시 환경 변수 검증 (브라우저가 아닌 서버 사이드에서만 실행)
if (typeof window === 'undefined') {
  try {
    // 필수 변수들이 잘 로드되었는지 접근해 봅니다.
    // (접근 시 validateVar가 호출되어 검증 수행됨)
    const _ = env.AGENTIC_AI_SERVER_URL
    console.log('[Env] Environment variables loaded successfully')

    // 디버깅용 로그 (보안상 운영 환경에서는 주의)
    console.log(`[Env] STT_URL: ${env.STT_SERVER_URL}`)
    console.log(`[Env] AGENT_URL: ${env.AGENTIC_AI_SERVER_URL}`)

  } catch (error) {
    console.error('[Env] ❌ Environment variable validation failed:', error)
    // Docker 환경에서 환경 변수 누락은 치명적이므로 프로세스를 종료하는 것도 방법입니다.
    // process.exit(1)
  }
}