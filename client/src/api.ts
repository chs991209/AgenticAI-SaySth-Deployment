// 프론트엔드 서버 URL (원격 서버)
const FRONTEND_SERVER_URL = import.meta.env.VITE_FRONTEND_SERVER_URL || 'https://d63681a50525.ngrok-free.app'
const MCP_SERVER_URL = import.meta.env.VITE_MCP_SERVER_URL || 'http://127.0.0.1:8003'

export interface ExecutePromptRequest {
  prompt: string
}

export interface Action {
  [key: string]: string[]
}

export interface ExecutePromptResponse {
  actions_list?: Action[]
  error?: string
}

export interface ExecuteActionRequest {
  actions_list: Action[]
}

export interface ExecuteActionResponse {
  actions_execution: string
  results: Array<{
    action: string
    input: string[]
    result: Array<{
      status: string
      [key: string]: any
    }>
  }>
}

export async function executePrompt(
  prompt: string
): Promise<ExecutePromptResponse> {
  // 프론트엔드 서버를 통해 요청 (원격 서버)
  const response = await fetch(`${FRONTEND_SERVER_URL}/api/execute`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      prompt,
      type: 'text'
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

export async function executeActions(
  actions_list: Action[]
): Promise<ExecuteActionResponse> {
  const response = await fetch(`${MCP_SERVER_URL}/pc_action_execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ actions_list }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error || `HTTP error! status: ${response.status}`
    )
  }

  return await response.json()
}

export async function sendAudioToASR(audioBlob: Blob): Promise<string> {
  // Convert blob to base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = async () => {
      try {
        const base64Audio = (reader.result as string).split(',')[1] // Remove data:audio/webm;base64, prefix

        // 프론트엔드 서버를 통해 음성 명령 실행
        const response = await fetch(`${FRONTEND_SERVER_URL}/api/execute`, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            audio: base64Audio,
            type: 'voice'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        // 프론트엔드 서버는 actions_list를 반환하므로, 텍스트는 추출할 수 없음
        // 일단 빈 문자열 반환 (실제로는 actions_list가 처리되어야 함)
        if (data.actions_list) {
          resolve('') // 텍스트는 없지만 성공으로 간주
        } else if (data.error) {
          reject(new Error(data.error))
        } else {
          reject(new Error('No response from server'))
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => {
      reject(new Error('Error reading audio file'))
    }
    reader.readAsDataURL(audioBlob)
  })
}

