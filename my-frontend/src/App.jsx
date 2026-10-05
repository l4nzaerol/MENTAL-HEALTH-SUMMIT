import { useEffect, useState } from 'react'
import FeedbackForm from './pages/FeedbackForm.jsx'
import CertificatePage from './pages/CertificatePage.jsx'
import './App.css'

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, '')
  const match = hash.match(/^\/c\/([^/?]+)/)
  if (match) return { name: 'certificate', id: decodeURIComponent(match[1]) }
  return { name: 'form', id: null }
}

export default function App() {
  const [route, setRoute] = useState(parseRoute)
  const [issued, setIssued] = useState(null)

  useEffect(() => {
    const onHashChange = () => {
      const next = parseRoute()
      setRoute(next)
      if (next.name !== 'certificate') setIssued(null)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function handleIssued(certificate) {
    setIssued(certificate)
    window.location.hash = `/c/${certificate.id}`
  }

  if (route.name === 'certificate') {
    return (
      <CertificatePage
        certId={route.id}
        preview={issued && issued.id === route.id ? issued : null}
        onBack={() => {
          window.location.hash = '/'
        }}
      />
    )
  }

  return <FeedbackForm onIssued={handleIssued} />
}
