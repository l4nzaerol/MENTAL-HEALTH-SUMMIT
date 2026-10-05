export const EVENT = {
  name: 'Mental Health Summit',
  shortName: 'MHS',
  tagline: 'Seminar feedback & certificate of participation',
  dateLabel: '2026',
  venueName: 'Summit venue',
}

export const SPEAKERS = [
  { id: 'speaker-1', name: 'Speaker 1', role: 'Keynote' },
  { id: 'speaker-2', name: 'Speaker 2', role: 'Plenary' },
  { id: 'speaker-3', name: 'Speaker 3', role: 'Plenary' },
]

export const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
}

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || ''

export const PUBLIC_BASE_URL = (
  import.meta.env.VITE_PUBLIC_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '')
