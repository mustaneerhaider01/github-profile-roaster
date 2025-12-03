import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { GoogleGenAI } from '@google/genai'

export interface GitHubUser {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string | null
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: 'User'
  site_admin: boolean

  // profile info
  name: string | null
  company: string | null
  blog: string | null
  location: string | null
  email: string | null
  hireable: boolean | null
  bio: string | null
  twitter_username: string | null

  // counts
  public_repos: number
  public_gists: number
  followers: number
  following: number

  // dates
  created_at: string // ISO
  updated_at: string // ISO
}

export const Route = createFileRoute('/')({ component: App })

const sanitizeGitHubUsername = (url: string) => {
  const matches = url.match(/github\.com\/([^/]+)|^[^/]+$/)
  return matches ? matches[1] || url : null
}

const ai = new GoogleGenAI({
  apiKey: process.env.VITE_GEMINI_API_KEY,
})

const roastProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      u: Pick<
        GitHubUser,
        'public_repos' | 'followers' | 'following' | 'created_at' | 'bio'
      >,
    ) => u,
  )
  .handler(async ({ data }) => {
    try {
      const { public_repos, followers, following, created_at, bio } = data

      const prompt = `
        You are a playful roast generator with a sharp but friendly sense of humor.
        Your job is to deliver clever, funny GitHub-themed roasts that feel like
        a friend teasing another friend. No meanness — just fun, smart, creative jokes.

        Roast this GitHub profile based on the stats below.
        Make it witty, surprising, and full of personality:

        - Public repos: ${public_repos}
        - Followers: ${followers}
        - Following: ${following}
        - Account created: ${created_at}
        - Bio: ${bio ?? 'No bio provided'}
      `

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt],
      })

      const roast = response.text

      return roast
    } catch (error) {}
  })

function App() {
  const [githubUrl, setGithubUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [roast, setRoast] = useState<string>()

  const handleRoast = async () => {
    setLoading(true)
    setError('')
    setRoast('')

    try {
      const username = sanitizeGitHubUsername(githubUrl)

      if (!username) {
        toast.error('Invalid GitHub URL or username')
      }

      const res = await fetch(`https://api.github.com/users/${username}`)

      if (!res.ok) {
        toast.error('GitHub profile not found')
      }

      const userData: GitHubUser = await res.json()

      const roastText = await roastProfile({ data: userData })

      setRoast(roastText)
      setGithubUrl('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 bg-white rounded-lg shadow-xl shadow-sky-100 overflow-hidden border-4 border-sky-500">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-sky-800">
          🔥 GitHub Profile Roaster 🔥
        </h1>

        <div className="space-y-6">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter GitHub profile URL or username"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50 disabled:pointer-events-none"
              disabled={loading}
            />
            <button
              onClick={handleRoast}
              disabled={loading || !githubUrl}
              className={`px-6 py-2 rounded-lg font-medium text-white transition-colors duration-150
              ${
                loading || !githubUrl
                  ? 'bg-sky-300 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2Icon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Roasting...
                </div>
              ) : (
                'Roast!'
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {roast && (
            <div className="p-6 bg-sky-50 rounded-lg border border-sky-300">
              <h2 className="text-sky-800 font-extrabold text-lg mb-2">
                🤣🤣 Brace Yourself for a Roast!
              </h2>
              <p className="text-sky-700 leading-relaxed">{roast}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
