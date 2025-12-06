# AgenticAI SaySth Client

TypeScript 기반 웹 클라이언트입니다.

## 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

## 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 디렉토리에 생성됩니다.

## 환경 변수

`.env` 파일을 생성하여 API URL을 설정할 수 있습니다:

```
VITE_API_URL=http://127.0.0.1:8002
VITE_MCP_SERVER_URL=http://127.0.0.1:8003
VITE_ASR_SERVER_URL=http://127.0.0.1:8004
VITE_FRONTEND_SERVER_URL=http://127.0.0.1:3000
VITE_USE_FRONTEND_SERVER=false
```

설정하지 않으면 기본값을 사용합니다:
- `VITE_API_URL`: `http://127.0.0.1:8002` (Agentic AI 서버)
- `VITE_MCP_SERVER_URL`: `http://127.0.0.1:8003` (Local MCP 서버)
- `VITE_ASR_SERVER_URL`: `http://127.0.0.1:8004` (ASR 서버, 직접 호출 시)
- `VITE_FRONTEND_SERVER_URL`: `http://127.0.0.1:3000` (Frontend Server, 프록시 사용 시)
- `VITE_USE_FRONTEND_SERVER`: `false` (true로 설정 시 Frontend Server를 통해 ASR 호출)

## 기능

- 🎤 마이크 버튼을 통한 음성 입력
- 🔊 ASR 서버를 통한 음성-텍스트 변환
- 🤖 Agentic AI를 통한 액션 생성
- ⚡ MCP 서버를 통한 액션 실행
- 📊 실행 결과 실시간 표시

