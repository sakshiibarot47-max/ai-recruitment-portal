import { useEffect, useRef, useState } from 'react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from './api'
import { formatDateTime } from './utils'

const REFRESH_MS = 30000

// Navbar ki ghanti: unread number, list, "Mark all as read"
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)

  function apply(data) {
    setItems(Array.isArray(data.notifications) ? data.notifications : [])
    setUnread(Number(data.unreadCount) || 0)
    setError('')
  }

  // Ghanti kholne par taza list lo
  async function refresh() {
    try {
      apply(await getNotifications())
    } catch (err) {
      setError(err.message || 'Could not load notifications.')
    }
  }

  useEffect(() => {
    let active = true

    const pull = () =>
      getNotifications()
        .then(data => {
          if (!active) return
          setItems(Array.isArray(data.notifications) ? data.notifications : [])
          setUnread(Number(data.unreadCount) || 0)
          setError('')
        })
        .catch(err => {
          if (active) setError(err.message || 'Could not load notifications.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })

    pull()
    const timer = setInterval(() => {
      if (!document.hidden) pull()
    }, REFRESH_MS)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const onClick = event => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    const onKey = event => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function markOne(item) {
    if (item.is_read) return

    try {
      await markNotificationRead(item.id)
      setItems(list => list.map(entry => (entry.id === item.id ? { ...entry, is_read: 1 } : entry)))
      setUnread(count => Math.max(count - 1, 0))
    } catch (err) {
      setError(err.message || 'Could not update the notification.')
    }
  }

  async function markAll() {
    try {
      await markAllNotificationsRead()
      setItems(list => list.map(entry => ({ ...entry, is_read: 1 })))
      setUnread(0)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not update notifications.')
    }
  }

  return (
    <div className="notif" ref={wrapRef}>
      <button
        type="button"
        className="notif-button"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          if (!open) refresh()
          setOpen(value => !value)
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="region" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            <button type="button" className="notif-link" onClick={markAll} disabled={unread === 0}>
              Mark all as read
            </button>
          </div>

          {error && <div className="notif-error" role="alert">{error}</div>}

          {loading ? (
            <p className="notif-empty">Loading...</p>
          ) : items.length === 0 ? (
            <p className="notif-empty">No notifications yet.</p>
          ) : (
            <ul className="notif-list">
              {items.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`notif-item${item.is_read ? '' : ' unread'}`}
                    onClick={() => markOne(item)}
                  >
                    <span>{item.message}</span>
                    <small>{formatDateTime(item.created_at)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
