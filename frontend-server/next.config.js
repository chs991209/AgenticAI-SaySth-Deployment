/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/execute',
        destination: '/api/execute',
      },
      {
        source: '/execute-voice',
        destination: '/api/execute', // 통합된 엔드포인트로 리다이렉트
      },
      {
        source: '/execute-voice-callback',
        destination: '/api/execute-voice-callback',
      },
    ]
  },
}

module.exports = nextConfig

