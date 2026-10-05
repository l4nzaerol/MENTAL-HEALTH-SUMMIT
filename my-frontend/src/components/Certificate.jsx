import { EVENT } from '../config'

function formatIssuedAt(iso) {
  if (!iso) return EVENT.dateLabel
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return EVENT.dateLabel
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Certificate({ certificate, qrDataUrl }) {
  return (
    <article className="certificate" id="certificate-print">
      <img
        className="certificate-bg"
        src="/certificate-template.svg"
        alt=""
      />
      <div className="certificate-content">
        <p className="certificate-kicker">Certificate of Participation</p>
        <h2 className="certificate-event">{EVENT.name}</h2>
        <p className="certificate-presented">This is presented to</p>
        <p className="certificate-name">{certificate.fullName}</p>
        <p className="certificate-body">
          for completing the seminar and submitting feedback for the venue,
          speakers, and overall program.
        </p>
        <p className="certificate-date">{formatIssuedAt(certificate.issuedAt)}</p>
        <div className="certificate-footer">
          <div>
            <p className="certificate-id">ID {certificate.id}</p>
            <p className="certificate-verify">Scan the QR code to view this certificate</p>
          </div>
          {qrDataUrl ? (
            <img className="certificate-qr" src={qrDataUrl} alt="Certificate verification QR code" />
          ) : (
            <div className="certificate-qr placeholder" />
          )}
        </div>
      </div>
    </article>
  )
}
