# AgenticAI-SaySth 배포 패키지

이 패키지는 Frontend Server와 Agentic AI Server만 포함하고 있습니다.

## 필수 요구사항

- Python 3.12 이상
- Node.js 18 이상 및 npm
- OpenAI API Key
- YouTube Data API v3 Key (YouTube 비디오 검색 기능 사용 시)

## 설치 및 실행 가이드

### 1. Agentic AI Server 설정

```bash
# Python 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 다음 API 키들을 설정하세요:
# - OPENAI_API_KEY: OpenAI API 키 (필수)
# - YOUTUBE_API_KEY: YouTube Data API v3 키 (YouTube 비디오 검색 기능 사용 시 필수)
# - FRONTEND_SERVER_URL: Frontend 서버 URL (callback URL이 제공되지 않을 때 사용, 기본값: http://localhost:3000)
```

### 2. Agentic AI Server 실행

```bash
# 가상환경이 활성화된 상태에서
uvicorn main:app --port 8002 --reload
```

서버는 `http://127.0.0.1:8002`에서 실행됩니다.

### 3. STT Server 설정 (선택사항)

STT Server는 별도로 실행해야 합니다. 기본 포트는 `8003`입니다.

### 4. Frontend Server 설정

```bash
# frontend-server 디렉토리로 이동
cd frontend-server

# 의존성 설치
npm install

# 환경 변수 설정
cp ../.env.example .env.local
# .env.local 파일을 열어서 다음 변수들을 설정하세요:
# - STT_SERVER_URL: STT 서버 URL (기본값: http://localhost:8003)
# - AGENTIC_AI_SERVER_URL: http://127.0.0.1:8002 (필수)
# - FRONTEND_SERVER_URL: Frontend 서버 URL (기본값: http://localhost:3000)
```

### 5. Frontend Server 실행

```bash
# frontend-server 디렉토리에서
npm run dev
```

서버는 `http://localhost:3000`에서 실행됩니다.

## 시스템 아키텍처

### 요청 흐름

#### 텍스트 명령
```
Client → Frontend Server (/execute) → Agent Server (8002) → Frontend Server → Client
```

#### 음성 명령
```
Client → Frontend Server (/execute) 
  → STT Server (8003) 
    → Agent Server (8002) 
      → Frontend Server (/execute-voice-callback) 
        → Client
```

## API 엔드포인트

### Agentic AI Server (포트 8002)

- `POST /execute`: 텍스트 프롬프트를 실행하여 액션 생성
- `POST /execute-voice-command`: 음성 명령(텍스트)을 실행하여 액션 생성 (callback_url 지원)

### Frontend Server (포트 3000)

- `POST /execute`: 통합 엔드포인트 (텍스트/음성 모두 처리)
  - 텍스트 명령: `{ "prompt": "...", "type": "text" }`
  - 음성 명령: `{ "audio": "base64...", "type": "voice" }`
- `POST /execute-voice`: `/execute`로 리다이렉트 (하위 호환성)
- `POST /execute-voice-callback`: Agent Server의 callback 엔드포인트 (내부 사용)

## API 사용 예시

### 텍스트 명령

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "아이브 뮤비 재생",
    "type": "text"
  }'
```

### 음성 명령

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "base64_encoded_audio_data",
    "type": "voice"
  }'
```

**응답 예시:**
```json
{
  "actions_list": [
    {
      "open_webbrowser": ["https://www.youtube.com/watch?v=xxx"]
    }
  ]
}
```

## 문제 해결

### Agentic AI Server가 시작되지 않는 경우
- Python 버전이 3.12 이상인지 확인: `python3 --version`
- 가상환경이 활성화되어 있는지 확인
- 모든 의존성이 설치되었는지 확인: `pip list`
- .env 파일에 OPENAI_API_KEY가 설정되어 있는지 확인

### Frontend Server가 시작되지 않는 경우
- Node.js 버전이 18 이상인지 확인: `node --version`
- npm 의존성이 설치되었는지 확인: `npm list`
- .env.local 파일이 frontend-server 디렉토리에 있는지 확인
- .env.local 파일의 필수 환경 변수가 설정되어 있는지 확인

### API 호출이 실패하는 경우
- Agentic AI Server가 실행 중인지 확인 (포트 8002)
- STT Server가 실행 중인지 확인 (포트 8003, 음성 명령 사용 시)
- Frontend Server의 .env.local 파일에서 다음을 확인:
  - `AGENTIC_AI_SERVER_URL`: `http://localhost:8002`
  - `STT_SERVER_URL`: `http://localhost:8003` (기본값)
  - `FRONTEND_SERVER_URL`: `http://localhost:3000` (기본값)
- CORS 설정이 올바른지 확인 (main.py의 CORS 설정)
- 네트워크 연결 상태 확인
