import { useEffect, useMemo, useState } from 'react'
import {
  clearTokens,
  getTaskStatusLabel,
  hasStoredSession,
  login,
  request,
} from './api'
import './App.css'

function App() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [authLoading, setAuthLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(hasStoredSession())
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [error, setError] = useState('')

  const groupedTasks = useMemo(() => {
    return {
      todo: tasks.filter((task) => task.status === 'todo'),
      in_progress: tasks.filter((task) => task.status === 'in_progress'),
      done: tasks.filter((task) => task.status === 'done'),
    }
  }, [tasks])

  async function hydrateSession() {
    setError('')
    setLoadingTasks(true)
    try {
      const [me, taskList] = await Promise.all([
        request('/auth/whoami/'),
        request('/tasks/'),
      ])
      setUser(me)
      setTasks(taskList)
      setSessionReady(true)
    } catch (err) {
      setError(err.message)
      clearTokens()
      setSessionReady(false)
      setUser(null)
      setTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    if (sessionReady) {
      hydrateSession()
    }
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setAuthLoading(true)
    setError('')
    try {
      await login(form)
      setSessionReady(true)
      await hydrateSession()
    } catch (err) {
      setError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    clearTokens()
    setSessionReady(false)
    setUser(null)
    setTasks([])
    setError('')
    setForm({ username: '', password: '' })
  }

  async function refreshTasks() {
    setLoadingTasks(true)
    setError('')
    try {
      const taskList = await request('/tasks/')
      setTasks(taskList)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingTasks(false)
    }
  }

  if (!sessionReady) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="badge">TeamTasks</p>
          <h1>Sign in to your task workspace</h1>
          <p className="muted">Use an existing Django account to continue.</p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Username
              <input
                required
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="jane"
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="••••••••"
              />
            </label>
            <button type="submit" disabled={authLoading}>
              {authLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="badge">TeamTasks</p>
          <h1>Hello {user?.username}</h1>
          <p className="muted">Track your assigned and team tasks in one view.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={refreshTasks} disabled={loadingTasks}>
            {loadingTasks ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="danger" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="board-grid">
        {Object.entries(groupedTasks).map(([status, items]) => (
          <article key={status} className="board-column">
            <header>
              <h2>{getTaskStatusLabel(status)}</h2>
              <span>{items.length}</span>
            </header>

            <div className="task-stack">
              {items.length === 0 && <p className="empty">No tasks in this lane.</p>}
              {items.map((task) => (
                <section key={task.id} className="task-card">
                  <h3>{task.title}</h3>
                  <p>{task.description || 'No description provided yet.'}</p>
                  <div className="meta">
                    <span>Team #{task.team}</span>
                    <span>{task.due_date ? `Due ${task.due_date}` : 'No due date'}</span>
                  </div>
                </section>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
