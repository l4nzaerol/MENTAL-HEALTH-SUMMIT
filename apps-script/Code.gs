const SHEET_NAME = 'Submissions'
const HEADERS = [
  'Timestamp',
  'CertificateId',
  'FullName',
  'Email',
  'Organization',
  'VenueRating',
  'VenueComment',
  'SpeakersOverall',
  'SpeakerRatings',
  'SeminarRating',
  'SeminarComments',
  'IdempotencyKey',
  'VerifyUrl',
]

function doGet(e) {
  const params = (e && e.parameter) || {}

  if (params.view === 'cert') {
    return renderCertificate_(params.id)
  }

  const result = lookupCertificate_(params.id)
  return jsonp_(result, params.callback)
}

function doPost(e) {
  try {
    const payload = parsePayload_(e)
    const result = submitFeedback_(payload)
    return json_(result)
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) })
  }
}

function setupSummitSheet() {
  const ss = SpreadsheetApp.getActive()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
  sheet.setFrozenRows(1)
  sheet.autoResizeColumns(1, HEADERS.length)
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Mental Health Summit')
    .addItem('Setup submissions sheet', 'setupSummitSheet')
    .addToUi()
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Empty request')
  }
  const payload = JSON.parse(e.postData.contents)
  if (!payload.fullName || !payload.email) {
    throw new Error('Name and email are required')
  }
  return payload
}

function submitFeedback_(payload) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(25000)) {
    return { ok: false, error: 'lock' }
  }

  try {
    const sheet = getSheet_()
    const email = String(payload.email).toLowerCase().trim()
    const existing = findRow_(sheet, 4, email) || findRow_(sheet, 12, payload.idempotencyKey)
    if (existing) {
      return { ok: true, duplicate: true, certificate: rowToCertificate_(existing) }
    }

    const certId = generateCertId_()
    const verifyUrl = ScriptApp.getService().getUrl() + '?view=cert&id=' + encodeURIComponent(certId)
    const now = new Date()
    sheet.appendRow([
      now,
      certId,
      String(payload.fullName).trim(),
      email,
      payload.organization || '',
      payload.venueRating || '',
      payload.venueComment || '',
      payload.speakersOverall || '',
      JSON.stringify(payload.speakerRatings || {}),
      payload.seminarRating || '',
      payload.seminarComments || '',
      payload.idempotencyKey || '',
      verifyUrl,
    ])
    SpreadsheetApp.flush()

    return {
      ok: true,
      duplicate: false,
      certificate: {
        id: certId,
        fullName: String(payload.fullName).trim(),
        email: email,
        issuedAt: now.toISOString(),
        verifyUrl: verifyUrl,
      },
    }
  } finally {
    lock.releaseLock()
  }
}

function lookupCertificate_(id) {
  if (!id) return { ok: false, error: 'Certificate id is required' }
  const sheet = getSheet_()
  const row = findRow_(sheet, 2, String(id).trim())
  if (!row) return { ok: false, error: 'Certificate not found' }
  return { ok: true, certificate: rowToCertificate_(row) }
}

function renderCertificate_(id) {
  const found = lookupCertificate_(id)
  const template = getCertificateTemplate_()
  template.ok = found.ok
  template.error = found.error || ''
  template.cert = found.certificate || {
    id: '',
    fullName: '',
    issuedAt: '',
    verifyUrl: '',
  }
  template.qrUrl = found.ok
    ? 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
      encodeURIComponent(found.certificate.verifyUrl)
    : ''
  template.issuedLabel = found.ok ? formatDate_(found.certificate.issuedAt) : ''
  return template
    .evaluate()
    .setTitle('Certificate of Participation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

function getCertificateTemplate_() {
  const names = ['Certificate', 'Certificate.html', 'certificate', 'certificate.html']
  for (let i = 0; i < names.length; i += 1) {
    try {
      return HtmlService.createTemplateFromFile(names[i])
    } catch (error) {
      // File missing or misnamed; try the next name, then the built-in HTML.
    }
  }
  return HtmlService.createTemplate(CERTIFICATE_PAGE_HTML_)
}

function getSheet_() {
  const ss = SpreadsheetApp.getActive()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    setupSummitSheet()
    sheet = ss.getSheetByName(SHEET_NAME)
  }
  return sheet
}

function findRow_(sheet, column, value) {
  if (!value) return null
  const lastRow = sheet.getLastRow()
  if (lastRow < 2) return null
  const needle = String(value).toLowerCase()
  const values = sheet.getRange(2, column, lastRow - 1, 1).getValues()
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).toLowerCase() === needle) {
      return sheet.getRange(i + 2, 1, 1, HEADERS.length).getValues()[0]
    }
  }
  return null
}

function rowToCertificate_(row) {
  const issued = row[0] instanceof Date ? row[0].toISOString() : String(row[0] || '')
  return {
    id: String(row[1] || ''),
    fullName: String(row[2] || ''),
    email: String(row[3] || ''),
    issuedAt: issued,
    verifyUrl: String(row[12] || ''),
  }
}

function generateCertId_() {
  return 'MHS-' + Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase()
}

function formatDate_(iso) {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMMM d, yyyy')
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

function jsonp_(data, callback) {
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')').setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    )
  }
  return json_(data)
}

const CERTIFICATE_PAGE_HTML_ =
  '<!DOCTYPE html><html><head><meta charset="UTF-8" />' +
  '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
  '<title>Certificate of Participation</title><style>' +
  ':root{--ink:#143d38;--muted:#4d655f;--gold:#c4a35a;--accent:#1f6f64;}' +
  'body{margin:0;background:#f3f6f2;color:var(--ink);font-family:"Segoe UI",system-ui,sans-serif;}' +
  '.wrap{width:min(980px,calc(100% - 24px));margin:24px auto 48px;}' +
  '.certificate{position:relative;aspect-ratio:1.414/1;background:#fffcf7;border:10px solid var(--accent);' +
  'outline:1px solid var(--gold);outline-offset:-18px;box-shadow:0 16px 40px rgba(20,61,56,.12);}' +
  '.content{position:absolute;inset:8%;display:flex;flex-direction:column;align-items:center;text-align:center;}' +
  '.kicker{letter-spacing:.22em;text-transform:uppercase;color:var(--gold);font-size:12px;}' +
  'h1{font-family:Georgia,serif;font-size:clamp(24px,4vw,42px);margin:8px 0 0;}' +
  '.name{font-family:Georgia,serif;font-size:clamp(26px,5vw,48px);margin:8px 0 0;border-bottom:1px solid var(--gold);padding-bottom:6px;}' +
  '.muted{color:var(--muted);}' +
  '.footer{width:100%;margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;text-align:left;gap:16px;}' +
  '.qr{width:88px;height:88px;background:#fff;}' +
  '.error{background:#fff;padding:24px;border-radius:16px;}' +
  '@media print{body{background:#fff;}.wrap{width:auto;margin:0;}.certificate{box-shadow:none;}}' +
  '</style></head><body><div class="wrap">' +
  '<? if (ok) { ?>' +
  '<article class="certificate"><div class="content">' +
  '<p class="kicker">Certificate of Participation</p><h1>Mental Health Summit</h1>' +
  '<p class="muted">This is presented to</p><p class="name"><?= cert.fullName ?></p>' +
  '<p class="muted">for completing the seminar and submitting feedback for the venue, speakers, and overall program.</p>' +
  '<p><strong><?= issuedLabel ?></strong></p>' +
  '<div class="footer"><div><p class="muted">ID <?= cert.id ?></p>' +
  '<p class="muted">Scan the QR code to view this certificate</p></div>' +
  '<img class="qr" src="<?!= qrUrl ?>" alt="Certificate QR code" /></div>' +
  '</div></article>' +
  '<? } else { ?>' +
  '<div class="error"><h1>Certificate not found</h1><p><?= error ?></p></div>' +
  '<? } ?>' +
  '</div></body></html>'
