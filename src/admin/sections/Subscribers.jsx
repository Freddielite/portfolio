import { useCallback, useEffect, useState } from 'react'
import Pager, { paginate } from '../Pager.jsx'
import { Download, RefreshCw, Send } from 'lucide-react'
import { adminFetch } from '../http.js'
import { getContent } from '../api.js'
import { saveFile } from '../native.js'
import { useAdmin, useRefresh } from '../AdminContext.jsx'
import { postState } from '../../lib/postStatus.js'

const day = (v) => {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

async function readJson(res) {
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

export default function Subscribers() {
  const { toast, confirm, go } = useAdmin()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [posts, setPosts] = useState([])
  const [postPage, setPostPage] = useState(1)
  const [recentPage, setRecentPage] = useState(1)
  const [signupHidden, setSignupHidden] = useState(false)
  const [sending, setSending] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { ok, body } = await readJson(await adminFetch('/api/admin/subscribers', { cache: 'no-store' }))
      if (!ok) throw new Error(body.error || 'Could not load subscribers.')
      setState({ loading: false, error: null, data: body })
    } catch (err) {
      setState({ loading: false, error: err.message, data: null })
    }
    try {
      const [p, s] = await Promise.all([getContent('posts'), getContent('siteSettings')])
      setPosts((p.data || []).filter((x) => postState(x) === 'published').sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))))
      setSignupHidden(!(s.data?.newsletterApiUrl && s.data?.newsletterFormSlug))
    } catch {
      /* the posts list is optional here */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRefresh(async () => {
    await load()
  })

  async function exportCsv() {
    try {
      const res = await adminFetch('/api/admin/subscribers?export=csv')
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not export.')
      const how = await saveFile(`subscribers-${new Date().toISOString().slice(0, 10)}.csv`, await res.blob())
      toast(how === 'shared' ? 'Subscribers ready to save' : 'Subscribers exported')
    } catch (err) {
      toast(err.message, { tone: 'error' })
    }
  }

  async function sendPost(post, force = false) {
    const count = state.data?.stats?.subscribed ?? 0
    if (!force) {
      const ok = await confirm({
        title: 'Email this post?',
        body: `"${post.title}" will be emailed to ${count} ${count === 1 ? 'subscriber' : 'subscribers'} now. This cannot be undone.`,
        confirmLabel: 'Send to subscribers',
        secure: true,
        secureReason: 'Email this post to your subscribers',
      })
      if (!ok) return
    }
    setSending(post.slug)
    try {
      const { ok, status, body } = await readJson(
        await adminFetch('/api/admin/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: post.slug, force }),
        })
      )
      if (status === 409 && body.alreadySent) {
        const again = await confirm({ title: 'Already emailed', body: 'This post was already sent to subscribers. Send it again?', confirmLabel: 'Send again', tone: 'danger', secure: true, secureReason: 'Email this post again' })
        setSending(null)
        if (again) return sendPost(post, true)
        return
      }
      if (!ok) throw new Error(body.error || 'Could not send.')
      if (body.held) {
        toast('Wynmail held it for review. Open it in Wynmail to check and send.', { tone: 'error', duration: 6000 })
      } else {
        toast(`Sending to ${body.queued} ${body.queued === 1 ? 'subscriber' : 'subscribers'}`)
      }
      await load()
    } catch (err) {
      toast(err.message, { tone: 'error', duration: 6000 })
    } finally {
      setSending(null)
    }
  }

  const { loading, error, data } = state
  const stats = data?.stats

  return (
    <div className="admin-subscribers">
      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Subscribers</h2>
            <p className="admin-hint">People who signed up for new posts by email, from Wynmail.</p>
          </div>
          <div className="admin-card-actions">
            {data?.configured && (
              <button type="button" className="admin-btn-ghost" onClick={exportCsv}>
                <Download size={15} aria-hidden="true" /> Export CSV
              </button>
            )}
            <button type="button" className="admin-icon-btn" onClick={load} disabled={loading} aria-label="Refresh subscribers">
              <RefreshCw size={16} className={loading ? 'admin-spin' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}
        {loading && !data && !error && <p className="admin-hint admin-loading">Asking Wynmail…</p>}

        {data && !data.configured && (
          <div className="admin-setup">
            <p className="admin-hint">Not connected yet. Add these in Vercel (Settings, Environment Variables), then redeploy once:</p>
            <ul className="admin-rows">
              {data.missing.map((k) => <li key={k}><code>{k}</code></li>)}
            </ul>
            <p className="admin-hint">WYNMAIL_API_URL is your Wynmail backend. WYNMAIL_API_KEY is a workspace key made on Wynmail's API page. WYNMAIL_LIST_ID is the number of your subscribers list (shown by the lists endpoint).</p>
          </div>
        )}

        {stats && (
          <>
            {signupHidden && (
              <div className="admin-note-row">
                <p className="admin-hint">The signup box is hidden on your site until you add the Wynmail API URL and form slug.</p>
                <button type="button" className="admin-link" onClick={() => go('settings', 'newsletterApiUrl')}>Open settings</button>
              </div>
            )}
            <div className="admin-stats">
              <div className="admin-stat is-static"><strong>{stats.subscribed}</strong><span>Subscribed</span><em>{stats.total} contacts on the list</em></div>
              <div className="admin-stat is-static"><strong>{stats.joined_7d}</strong><span>Joined this week</span><em>last 7 days</em></div>
              <div className="admin-stat is-static"><strong>{stats.joined_30d}</strong><span>Joined this month</span><em>last 30 days</em></div>
              <div className="admin-stat is-static"><strong>{stats.unsubscribed}</strong><span>Unsubscribed</span><em>{stats.bounced + stats.complained} bounced or reported</em></div>
            </div>
          </>
        )}
      </section>

      {stats && (
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Email a post</h2>
              <p className="admin-hint">Send a live post to every subscriber. Each post can be sent once.</p>
            </div>
          </div>
          {!posts.length ? (
            <p className="admin-hint">No live posts to send yet.</p>
          ) : (
            <>
            <ul className="admin-rows">
              {paginate(posts, postPage, 5).items.map((p) => {
                const sent = data.sent?.[p.slug]
                return (
                  <li key={p.slug}>
                    <span className="admin-row-main">
                      <strong>{p.title}</strong>
                      <span className="admin-hint">
                        {sent
                          ? `${sent.status === 'sending' ? 'Sending' : 'Emailed'} ${day(sent.at)} · ${sent.sent} sent · ${sent.opened} opened · ${sent.clicked} clicked`
                          : `Published ${String(p.publishedAt).slice(0, 10)}`}
                      </span>
                    </span>
                    {sent ? (
                      <span className="admin-badge is-published">Sent</span>
                    ) : (
                      <button type="button" className="admin-btn" onClick={() => sendPost(p)} disabled={!!sending || stats.subscribed === 0}>
                        <Send size={15} aria-hidden="true" /> {sending === p.slug ? 'Sending…' : 'Send'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            <Pager p={paginate(posts, postPage, 5)} onPage={setPostPage} label="posts" />
            </>
          )}
        </section>
      )}

      {data?.recent && (
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Latest signups</h2>
              <p className="admin-hint">The 10 newest people on the list.</p>
            </div>
          </div>
          {!data.recent.length ? (
            <p className="admin-hint">Nobody yet. Once the signup box is live, new people show up here.</p>
          ) : (
            <>
            <ul className="admin-rows">
              {paginate(data.recent, recentPage, 5).items.map((c) => (
                <li key={c.email}>
                  <span className="admin-row-main">
                    <strong>{c.email}</strong>
                    <span className="admin-hint">{[[c.first_name, c.last_name].filter(Boolean).join(' '), day(c.created_at)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={`admin-badge ${c.status === 'subscribed' ? 'is-published' : 'is-draft'}`}>{c.status}</span>
                </li>
              ))}
            </ul>
            <Pager p={paginate(data.recent, recentPage, 5)} onPage={setRecentPage} label="signups" />
            </>
          )}
        </section>
      )}
    </div>
  )
}
