import { useEffect, useState } from 'react'
import Certificate from '../components/Certificate.jsx'
import { fetchCertificate } from '../lib/api.js'

function qrImageUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=${encodeURIComponent(text)}`
}

export default function CertificatePage({ certId, preview, onBack }) {
  const [certificate, setCertificate] = useState(preview || null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!preview)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        let record = preview
        if (!record && certId) {
          const result = await fetchCertificate(certId)
          if (!result?.ok) {
            throw new Error(result?.error || 'Certificate not found')
          }
          record = result.certificate
        }
        if (!record || cancelled) return
        setCertificate(record)

        const qrTarget =
          record.verifyUrl ||
          `${window.location.origin}${window.location.pathname}#/c/${record.id}`
        if (!cancelled) setQrDataUrl(qrImageUrl(qrTarget))
      } catch (loadError) {
        if (!cancelled) setError(loadError.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [certId, preview])

  if (loading) {
    return (
      <main className="page">
        <p className="note">Loading certificate…</p>
      </main>
    )
  }

  if (error || !certificate) {
    return (
      <main className="page">
        <div className="card">
          <h1>Certificate not found</h1>
          <p className="lede">{error || 'This QR code or link is not in the summit records.'}</p>
          {onBack ? (
            <button type="button" onClick={onBack}>
              Back to feedback form
            </button>
          ) : null}
        </div>
      </main>
    )
  }

  return (
    <main className="page certificate-page">
      <header className="hero-card compact">
        <h1>Your e-certificate</h1>
        <p className="lede">
          Save or print this certificate. The QR code opens this same record when scanned.
        </p>
      </header>

      <Certificate certificate={certificate} qrDataUrl={qrDataUrl} />

      <div className="actions">
        <button type="button" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        {onBack ? (
          <button type="button" className="secondary" onClick={onBack}>
            Submit another response
          </button>
        ) : null}
      </div>
    </main>
  )
}
