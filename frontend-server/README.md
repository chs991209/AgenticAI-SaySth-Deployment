# AgenticAI SaySth Frontend Server

Next.js 기반 API 프록시 서버입니다. 클라이언트의 요청을 STT 서버, Agentic AI 서버, MCP 서버로 전달하는 역할을 합니다.

## 설치

```bash
npm install
```

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하여 서버 주소를 설정해야 합니다:

```bash
# .env.local 파일 생성
cat > .env.local << EOF
# STT Server URL (선택, 기본값: http://localhost:8003)
STT_SERVER_URL=http://localhost:8003

# Agentic AI Server URL (필수)
AGENTIC_AI_SERVER_URL=http://127.0.0.1:8002

# Frontend Server URL (선택, 기본값: http://localhost:3000)
# Agent Server가 callback을 보낼 주소
FRONTEND_SERVER_URL=http://localhost:3000
EOF
```

**중요:** 
- 필수 환경 변수: `AGENTIC_AI_SERVER_URL`
- 선택 환경 변수: `STT_SERVER_URL`, `FRONTEND_SERVER_URL` (기본값 사용 가능)
- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

## 개발 서버 실행

```bash
npm run dev
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

**참고:** 이 서버는 API 엔드포인트만 제공하며, 웹페이지는 제공하지 않습니다.

## 빌드

```bash
npm run build
npm start
```

## API 엔드포인트

> **참고**: 모든 엔드포인트는 `/api/` 접두사 없이도 접근 가능합니다 (Next.js rewrites 사용).
> 예: `/execute` 또는 `/api/execute` 모두 동일하게 작동합니다.

### POST /execute (통합 엔드포인트)

텍스트 또는 음성 명령을 처리하는 통합 엔드포인트입니다.

#### 텍스트 명령

**Request:**
```json
{
  "prompt": "아이브 뮤비 재생",
  "type": "text"
}
```

**흐름:** Client → Frontend Server → Agent Server (8002) → Frontend Server → Client

**Response:**
```json
{
  "actions_list": [
    {
      "open_webbrowser": ["https://www.youtube.com/watch?v=xxx"]
    }
  ]
}
```

#### 음성 명령

**Request:**
```json
{
  "audio": "base64_encoded_audio_data",
  "type": "voice"
}
```

**흐름:** Client → Frontend Server → STT Server (8003) → Agent Server (8002) → Frontend Server (callback) → Client

**Response:**
```json
{
  "actions_list": [
    {
      "open_webbrowser": ["https://www.youtube.com/watch?v=xxx"]
    }
  ]
}
```

**참고:**
- `type` 필드는 선택사항입니다. `audio`가 있으면 자동으로 `voice`로 감지됩니다.
- `/execute-voice`는 `/execute`로 리다이렉트됩니다 (하위 호환성).

### POST /execute-voice-callback (내부 사용)

Agent Server가 음성 명령 처리 후 응답을 보내는 callback 엔드포인트입니다. 클라이언트가 직접 호출하지 않습니다.

## 기능

- 🔊 **통합 엔드포인트**: 텍스트/음성 명령을 하나의 엔드포인트에서 처리
- 🎤 **STT 서버 연동**: 음성 데이터를 STT 서버로 전송하여 텍스트로 변환
- 🤖 **Agentic AI 서버 연동**: 변환된 텍스트를 Agent 서버로 전달하여 액션 생성
- 📞 **Callback 지원**: Agent 서버가 비동기로 응답을 전달할 수 있도록 callback URL 제공
- 🔄 **하위 호환성**: 기존 `/execute-voice` 엔드포인트는 `/execute`로 리다이렉트

## 시스템 아키텍처

### 텍스트 명령 흐름
```
Client
  ↓ POST /execute { prompt, type: "text" }
Frontend Server (3000)
  ↓ POST /execute { prompt }
Agent Server (8002)
  ↓ { actions_list }
Frontend Server
  ↓ { actions_list }
Client
```

### 음성 명령 흐름
```
Client
  ↓ POST /execute { audio, type: "voice" }
Frontend Server (3000)
  ↓ POST /stt { data: audio, agent_server_url, callback_url }
STT Server (8003)
  ↓ POST /execute-voice-command { prompt, callback_url }
Agent Server (8002)
  ↓ POST /execute-voice-callback { actions_list }
Frontend Server
  ↓ { actions_list }
Client
```

