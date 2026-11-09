import { RefreshCw, WifiOff } from 'lucide-react'
import { retryNow, useNetwork } from './network.js'

// A strip at the top of the page while the admin cannot reach its server.
// What is on screen stays (saved data where there is some); Retry checks the
// connection and reloads whatever failed. It also retries by itself when the
// phone reports the connection is back, and every 30 seconds.
export default function OfflineBanner() {
  const { offline, retrying } = useNetwork()
  if (!offline) return null
  return (
    <div className="admin-offline" role="status">
      <WifiOff size={16} aria-hidden="true" className="admin-offline-mark" />
      <p>
        <strong>You’re offline.</strong> <span>Showing what was last loaded. Saving needs a connection.</span>
      </p>
      <button type="button" className="admin-offline-retry" onClick={retryNow} disabled={retrying}>
        <RefreshCw size={15} className={retrying ? 'admin-spin' : ''} aria-hidden="true" />
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  )
}
