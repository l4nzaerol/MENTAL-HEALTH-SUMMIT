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
  const template = HtmlService.createTemplateFromFile('Certificate')
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
