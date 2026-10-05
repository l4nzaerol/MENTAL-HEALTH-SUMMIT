import { useMemo, useState } from 'react'
import { EVENT, SPEAKERS } from '../config'
import StarRating from '../components/StarRating.jsx'
import { submitFeedback } from '../lib/api.js'

const emptyForm = {
  fullName: '',
  email: '',
  organization: '',
  venueRating: 0,
  venueComment: '',
  speakersOverall: 0,
  speakerRatings: Object.fromEntries(SPEAKERS.map((speaker) => [speaker.id, 0])),
  seminarRating: 0,
  seminarComments: '',
  consent: false,
}

export default function FeedbackForm({ onIssued }) {
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateSpeaker(id, value) {
    setForm((current) => ({
      ...current,
      speakerRatings: { ...current.speakerRatings, [id]: value },
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.fullName.trim() || !form.email.trim()) {
      setError('Name and email are required for your certificate.')
      return
    }
    if (!form.venueRating || !form.speakersOverall || !form.seminarRating) {
      setError('Please rate the venue, speakers, and overall seminar.')
      return
    }
    if (SPEAKERS.some((speaker) => !form.speakerRatings[speaker.id])) {
      setError('Please rate each speaker.')
      return
    }
    if (!form.consent) {
      setError('Please confirm that your name can appear on the certificate.')
      return
    }

    setStatus('submitting')
    try {
      const result = await submitFeedback({
        action: 'submit',
        idempotencyKey,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        organization: form.organization.trim(),
        venueRating: form.venueRating,
        venueComment: form.venueComment.trim(),
        speakersOverall: form.speakersOverall,
        speakerRatings: form.speakerRatings,
        seminarRating: form.seminarRating,
        seminarComments: form.seminarComments.trim(),
      })

      if (!result?.ok || !result.certificate) {
        throw new Error(result?.error || 'Submission failed')
      }

      onIssued(result.certificate)
    } catch (submitError) {
      setStatus('idle')
      setError(
        submitError.message ||
          'The form is busy with other submissions. Please wait a moment and try again.',
      )
    }
  }

  const busy = status === 'submitting'

  return (
    <main className="page">
      <header className="hero-card">
        <p className="eyebrow">{EVENT.dateLabel}</p>
        <h1>{EVENT.name}</h1>
        <p className="lede">{EVENT.tagline}</p>
        <p className="note">
          Complete this form after the seminar. Your e-certificate is issued as soon as
          feedback is saved.
        </p>
      </header>

      <form className="card form" onSubmit={handleSubmit}>
        <section>
          <h2>Participant</h2>
          <label>
            Full name
            <input
              value={form.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              autoComplete="name"
              required
              maxLength={80}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              autoComplete="email"
              required
              maxLength={120}
            />
          </label>
          <label>
            Organization <span className="optional">(optional)</span>
            <input
              value={form.organization}
              onChange={(event) => update('organization', event.target.value)}
              autoComplete="organization"
              maxLength={120}
            />
          </label>
        </section>

        <section>
          <h2>Venue</h2>
          <p className="section-copy">
            Rate {EVENT.venueName}: accessibility, comfort, facilities, and overall setting.
          </p>
          <StarRating
            name="venueRating"
            value={form.venueRating}
            onChange={(value) => update('venueRating', value)}
          />
          <label>
            Venue comments <span className="optional">(optional)</span>
            <textarea
              value={form.venueComment}
              onChange={(event) => update('venueComment', event.target.value)}
              maxLength={1000}
              rows={3}
            />
          </label>
        </section>

        <section>
          <h2>Speakers</h2>
          <p className="section-copy">Rate each speaker, then the speaker program as a whole.</p>
          {SPEAKERS.map((speaker) => (
            <div className="speaker-block" key={speaker.id}>
              <div>
                <h3>{speaker.name}</h3>
                <p className="role">{speaker.role}</p>
              </div>
              <StarRating
                name={`speaker-${speaker.id}`}
                value={form.speakerRatings[speaker.id]}
                onChange={(value) => updateSpeaker(speaker.id, value)}
              />
            </div>
          ))}
          <h3 className="subhead">Overall speakers</h3>
          <StarRating
            name="speakersOverall"
            value={form.speakersOverall}
            onChange={(value) => update('speakersOverall', value)}
          />
        </section>

        <section>
          <h2>Entire seminar</h2>
          <p className="section-copy">
            Share comments on the program, organization, and what should continue or change.
          </p>
          <StarRating
            name="seminarRating"
            value={form.seminarRating}
            onChange={(value) => update('seminarRating', value)}
          />
          <label>
            Comments for the entire seminar
            <textarea
              value={form.seminarComments}
              onChange={(event) => update('seminarComments', event.target.value)}
              maxLength={2000}
              rows={5}
              required
            />
          </label>
        </section>

        <label className="consent">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(event) => update('consent', event.target.checked)}
            required
          />
          I confirm that the name above can appear on my e-certificate and that this
          feedback may be stored in the summit spreadsheet.
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={busy}>
          {busy ? 'Saving feedback…' : 'Submit feedback and get certificate'}
        </button>
        {busy ? (
          <p className="note">
            If many people are submitting at once, this may take a few seconds.
          </p>
        ) : null}
      </form>
    </main>
  )
}
