import { APPS_SCRIPT_URL } from '../config'

const STORAGE_KEY = 'mhs-submissions-v1'
const MAX_ATTEMPTS = 8

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeLocal(rows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

function makeCertId() {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  return `MHS-${rand}`
}

function toCertificate(row) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    issuedAt: row.issuedAt,
    verifyUrl: row.verifyUrl,
  }
}

async function submitLocal(payload) {
  const rows = readLocal()
  const email = payload.email.toLowerCase().trim()
  const existing = rows.find((row) => row.email === email)
  if (existing) {
    return { ok: true, duplicate: true, certificate: toCertificate(existing), demo: true }
  }

  const id = makeCertId()
  const issuedAt = new Date().toISOString()
  const origin = window.location.origin + window.location.pathname
  const row = {
    ...payload,
    email,
    id,
    issuedAt,
    verifyUrl: `${origin}#/c/${id}`,
  }
  rows.push(row)
  writeLocal(rows)
  return { ok: true, duplicate: false, certificate: toCertificate(row), demo: true }
}

function lookupLocal(id) {
  const row = readLocal().find((item) => item.id === id)
  if (!row) return { ok: false, error: 'Certificate not found' }
  return { ok: true, certificate: toCertificate(row), demo: true }
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = `mhs_cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('The certificate service timed out. Please try again.'))
    }, 20000)

    function cleanup() {
      clearTimeout(timer)
      delete window[callback]
      script.remove()
    }

    window[callback] = (data) => {
      cleanup()
      resolve(data)
    }

    const script = document.createElement('script')
    const joiner = url.includes('?') ? '&' : '?'
    script.src = `${url}${joiner}callback=${callback}`
    script.onerror = () => {
      cleanup()
      reject(new Error('Could not reach Google Sheets. Check the Apps Script URL.'))
    }
    document.body.appendChild(script)
  })
}

async function postWithRetry(payload) {
  let lastError = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })

      if (response.status === 429 || response.status >= 500) {
        throw new Error('busy')
      }

      const data = await response.json()
      if (data.error === 'busy' || data.error === 'lock') {
        throw new Error('busy')
      }
      return data
    } catch (error) {
      lastError = error
      const wait = Math.min(12000, 400 * 2 ** attempt) + Math.floor(Math.random() * 400)
      await sleep(wait)
    }
  }

  throw lastError || new Error('Could not save your feedback. Please try again.')
}

export async function submitFeedback(payload) {
  if (!APPS_SCRIPT_URL) {
    return submitLocal(payload)
  }
  return postWithRetry(payload)
}

export async function fetchCertificate(id) {
  if (!APPS_SCRIPT_URL) {
    return lookupLocal(id)
  }
  return jsonp(`${APPS_SCRIPT_URL}?action=lookup&id=${encodeURIComponent(id)}`)
}
