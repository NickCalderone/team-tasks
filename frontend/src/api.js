const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const ACCESS_TOKEN_KEY = 'teamtasks.access_token'
const REFRESH_TOKEN_KEY = 'teamtasks.refresh_token'

function parseJsonSafe(response) {
  return response
    .text()
    .then((text) => {
      if (!text) {
        return null
      }
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    })
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

function setTokens({ access, refresh }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) {
    return null
  }

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    clearTokens()
    return null
  }

  const payload = await parseJsonSafe(response)
  if (!payload?.access) {
    clearTokens()
    return null
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, payload.access)
  return payload.access
}

export async function request(path, options = {}) {
  const headers = {
    ...(options.headers ?? {}),
  }

  let token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && token) {
    token = await refreshAccessToken()

    if (token) {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      })
    }
  }

  const payload = await parseJsonSafe(response)
  if (!response.ok) {
    const message =
      payload?.detail ||
      (typeof payload === 'object' ? JSON.stringify(payload) : null) ||
      `Request failed with ${response.status}`
    throw new Error(message)
  }

  return payload
}

export async function login({ username, password }) {
  const payload = await request('/auth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!payload?.access || !payload?.refresh) {
    throw new Error('Login response did not contain tokens.')
  }

  setTokens(payload)
  return payload
}

export function hasStoredSession() {
  return Boolean(getAccessToken() || getRefreshToken())
}

export function getTaskStatusLabel(status) {
  const map = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  }
  return map[status] ?? status
}
