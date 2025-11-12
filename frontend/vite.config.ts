import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

// Get git information for development builds
const getGitInfo = () => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    const commit = execSync('git rev-parse --short=7 HEAD').toString().trim()
    return { branch, commit }
  } catch (error) {
    console.warn('Could not get git info:', error)
    return { branch: 'unknown', commit: 'unknown' }
  }
}

const gitInfo = getGitInfo()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 7152,
    host: true,
  },
  define: {
    __GIT_BRANCH__: JSON.stringify(gitInfo.branch),
    __GIT_COMMIT__: JSON.stringify(gitInfo.commit),
  },
})
