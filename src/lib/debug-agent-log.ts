const DEBUG_ENDPOINT = 'http://127.0.0.1:7665/ingest/d09b9390-480c-4c9c-9484-aab8831cc889'
const SESSION_ID = '4ff9c8'

export function debugAgentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'pre-fix',
): void {
  const payload = {
    sessionId: SESSION_ID,
    location,
    message,
    data,
    hypothesisId,
    runId,
    timestamp: Date.now(),
  }
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: JSON.stringify(payload),
  }).catch(() => {})
  console.log('[DEBUG-4ff9c8]', JSON.stringify(payload))
  // #endregion
}
