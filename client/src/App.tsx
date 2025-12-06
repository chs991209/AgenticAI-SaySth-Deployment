import React, { useState } from 'react'
import { executePrompt, executeActions, ExecuteActionResponse } from './api'
import MicrophoneButton from './components/MicrophoneButton'
import './App.css'

interface Action {
  [key: string]: string[]
}

interface ApiResponse {
  actions_list?: Action[]
  error?: string
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecuteActionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [commandType, setCommandType] = useState<'voice' | 'text' | null>(null)

  const handleMicrophoneTranscript = (text: string) => {
    setPrompt(text)
  }

  const handleVoiceCommand = async (text: string) => {
    // 음성 명령은 자동으로 처리
    setLoading(true)
    setError(null)
    setResult(null)
    setExecutionResult(null)
    setCommandType('voice')

    try {
      // 1. Agentic AI를 호출하여 액션 생성
      const response = await executePrompt(text)
      setResult(response)

      // 2. 액션이 생성되었으면 MCP 서버에서 실행
      if (response.actions_list && response.actions_list.length > 0) {
        setExecuting(true)
        try {
          const execResult = await executeActions(response.actions_list)
          setExecutionResult(execResult)
        } catch (execErr) {
          setError(
            execErr instanceof Error
              ? execErr.message
              : '액션 실행 중 오류가 발생했습니다.'
          )
        } finally {
          setExecuting(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setExecutionResult(null)
    setCommandType('text')

    try {
      // 1. Agentic AI를 호출하여 액션 생성
      const response = await executePrompt(prompt)
      setResult(response)

      // 2. 액션이 생성되었으면 MCP 서버에서 실행
      if (response.actions_list && response.actions_list.length > 0) {
        setExecuting(true)
        try {
          const execResult = await executeActions(response.actions_list)
          setExecutionResult(execResult)
        } catch (execErr) {
          setError(
            execErr instanceof Error
              ? execErr.message
              : '액션 실행 중 오류가 발생했습니다.'
          )
        } finally {
          setExecuting(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">AgenticAI SaySth</h1>
        <p className="subtitle">의도를 인식하고 액션을 생성하는 AI 에이전트</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="input-group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 아이브 뮤비 재생, 네이버 뉴스 열기, 포토샵 실행"
              className="textarea"
              rows={4}
              disabled={loading || executing}
            />
            <div className="microphone-container">
              <MicrophoneButton
                onTranscript={handleMicrophoneTranscript}
                onVoiceCommand={handleVoiceCommand}
                disabled={loading || executing}
              />
            </div>
          </div>
          <button
            type="submit"
            className="submit-button"
            disabled={loading || executing || !prompt.trim()}
          >
            {loading
              ? 'AI 처리 중...'
              : executing
              ? '액션 실행 중...'
              : '실행'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <strong>오류:</strong> {error}
          </div>
        )}

        {result && (
          <div className="result">
            {result.error ? (
              <div className="error-message">
                <strong>오류:</strong> {result.error}
              </div>
            ) : (
              <>
                <div className="result-header">
                  <h2 className="result-title">생성된 액션:</h2>
                  {commandType && (
                    <span className="command-type-icon" title={commandType === 'voice' ? '음성 명령' : '텍스트 명령'}>
                      {commandType === 'voice' ? '🎤' : '⌨️'}
                    </span>
                  )}
                </div>
                {result.actions_list && result.actions_list.length > 0 ? (
                  <div className="actions-list">
                    {result.actions_list.map((action, index) => (
                      <div key={index} className="action-item">
                        {Object.entries(action).map(([key, values]) => (
                          <div key={key} className="action-entry">
                            <strong className="action-key">{key}:</strong>
                            <ul className="action-values">
                              {values.map((value, i) => (
                                <li key={i}>{value}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-actions">액션이 생성되지 않았습니다.</p>
                )}
              </>
            )}
          </div>
        )}

        {executionResult && (
          <div className="result execution-result">
            <h2 className="result-title">실행 결과:</h2>
            <div className="execution-status">
              <strong>상태:</strong>{' '}
              <span
                className={
                  executionResult.actions_execution === 'Done'
                    ? 'status-success'
                    : 'status-warning'
                }
              >
                {executionResult.actions_execution}
              </span>
            </div>
            <div className="execution-details">
              {executionResult.results.map((result, index) => (
                <div key={index} className="execution-item">
                  <div className="execution-action">
                    <strong>액션:</strong> {result.action}
                  </div>
                  <div className="execution-input">
                    <strong>입력:</strong> {result.input.join(', ')}
                  </div>
                  <div className="execution-output">
                    <strong>결과:</strong>
                    <ul className="execution-results-list">
                      {result.result.map((item, i) => (
                        <li key={i} className="execution-result-item">
                          <span
                            className={`status-badge ${
                              item.status === 'opened' || item.status === 'executed'
                                ? 'status-success'
                                : item.status === 'error' || item.status === 'not_found'
                                ? 'status-error'
                                : 'status-info'
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.error && (
                            <span className="error-text">: {item.error}</span>
                          )}
                          {item.url && (
                            <span className="info-text"> - {item.url}</span>
                          )}
                          {item.program && (
                            <span className="info-text"> - {item.program}</span>
                          )}
                          {item.path && (
                            <span className="info-text"> ({item.path})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

