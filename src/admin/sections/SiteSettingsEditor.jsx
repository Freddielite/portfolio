import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import ImageUploader from '../ImageUploader.jsx'
import FileUploader from '../FileUploader.jsx'
import { validateSettings } from '../validate.js'

function Field({ label, hint, name, children }) {
  return (
    <div className="admin-field" data-field={name}>
      <label className="admin-label">{label}</label>
      {children}
      {hint && <p className="admin-hint">{hint}</p>}
    </div>
  )
}

const JUMPS = [
  ['identity', 'Identity'], ['availability', 'Availability'], ['hero', 'Hero'], ['about', 'About'],
  ['contact', 'Contact'], ['pulse', 'Live status'], ['seo', 'SEO'],
]

export default function SiteSettingsEditor() {
  const { data, loading, saving, error, conflict, savedAt, commit, save, reload } = useAdminContent('siteSettings')
  const [form, setForm] = useState(null)
  const [restoredFrom, setRestoredFrom] = useState(null)

  useEffect(() => {
    if (data) {
      setForm(data)
      setRestoredFrom(null)
    }
  }, [data])

  const dirty = !loading && form && JSON.stringify(form) !== JSON.stringify(data)
  useUnsavedChangesWarning(dirty)

  if (loading || !form) return <p className="admin-hint admin-loading">Loading settings…</p>

  const bar = {
    saving, error, savedAt, dirty, conflict, commit, restoredFrom, errors: validateSettings(form), onReload: reload, type: 'siteSettings',
    onRestore: (d, c) => { setForm(d); setRestoredFrom(c) },
    onSave: () => save(form),
    onDiscard: () => { setForm(data); setRestoredFrom(null) },
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="admin-section">
      <SaveBar {...bar} />
      <nav className="admin-jump" aria-label="Jump to a group of settings">
        {JUMPS.map(([id, name]) => (
          <a key={id} href={`#settings-${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{name}</a>
        ))}
      </nav>

      <h2 id="settings-identity">Identity</h2>
      <div className="admin-grid-2">
        <Field label="Full name" name="name"><input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Short name (nav, mobile)" name="shortName"><input value={form.shortName} onChange={(e) => set('shortName', e.target.value)} /></Field>
        <Field label="Initials (logo mark)" name="initials"><input value={form.initials} onChange={(e) => set('initials', e.target.value)} /></Field>
        <Field label="Tagline" name="tagline"><input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
        <Field label="Company" name="company"><input value={form.company} onChange={(e) => set('company', e.target.value)} /></Field>
        <Field label="Location" name="location"><input value={form.location} onChange={(e) => set('location', e.target.value)} /></Field>
        <Field label="Timezone" name="timezone"><input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} /></Field>
      </div>

      <ImageUploader label="Profile photo" value={form.photo} onChange={(v) => set('photo', v)} folder="profile" />

      <h2 id="settings-availability">Availability</h2>
      <div className="admin-grid-2">
        <Field label="Availability label" name="availability"><input value={form.availability} onChange={(e) => set('availability', e.target.value)} /></Field>
        <Field label="Response time" name="responseTime"><input value={form.responseTime} onChange={(e) => set('responseTime', e.target.value)} /></Field>
        <Field label="Best way to reach you" name="bestWayToReach"><input value={form.bestWayToReach} onChange={(e) => set('bestWayToReach', e.target.value)} /></Field>
        <Field label="Show as available for work?">
          <label className="admin-checkbox">
            <input type="checkbox" checked={!!form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} />
            Currently available
          </label>
        </Field>
      </div>

      <h2 id="settings-hero">Hero section</h2>
      <div className="admin-grid-2">
        <Field label="Greeting name" name="heroGreetingName"><input value={form.heroGreetingName} onChange={(e) => set('heroGreetingName', e.target.value)} /></Field>
        <Field label="Headline line 1" name="heroHeadlineLine1"><input value={form.heroHeadlineLine1} onChange={(e) => set('heroHeadlineLine1', e.target.value)} /></Field>
        <Field label="Headline highlight (line 2)" name="heroHeadlineHighlight"><input value={form.heroHeadlineHighlight} onChange={(e) => set('heroHeadlineHighlight', e.target.value)} /></Field>
      </div>
      <Field label="Hero subtext" name="heroSub">
        <textarea rows={3} value={form.heroSub} onChange={(e) => set('heroSub', e.target.value)} />
      </Field>

      <h2 id="settings-about">About section</h2>
      <Field label="About paragraphs" hint="One paragraph per line, separated by a blank line.">
        <textarea
          rows={6}
          value={(form.aboutParagraphs || []).join('\n\n')}
          onChange={(e) =>
            set(
              'aboutParagraphs',
              e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
            )
          }
        />
      </Field>
      <div className="admin-grid-2">
        <Field label="Focus areas" name="focusAreas"><input value={form.focusAreas} onChange={(e) => set('focusAreas', e.target.value)} /></Field>
        <Field label="Works with" name="worksWith"><input value={form.worksWith} onChange={(e) => set('worksWith', e.target.value)} /></Field>
        <Field label="Engagement" name="engagement"><input value={form.engagement} onChange={(e) => set('engagement', e.target.value)} /></Field>
      </div>

      <h2 id="settings-testimonials-toggle">Testimonials</h2>
      <Field label="Show testimonials section on the live site?" name="showTestimonials">
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={!!form.showTestimonials}
            onChange={(e) => set('showTestimonials', e.target.checked)}
          />
          Show testimonials
        </label>
      </Field>

      <h2 id="settings-contact">Contact</h2>
      <Field label="Contact headline" name="contactHeadline"><input value={form.contactHeadline} onChange={(e) => set('contactHeadline', e.target.value)} /></Field>
      <Field label="Contact subtext" name="contactSub"><textarea rows={2} value={form.contactSub} onChange={(e) => set('contactSub', e.target.value)} /></Field>
      <div className="admin-grid-2">
        <Field label="Email" name="email"><input inputMode="email" autoCapitalize="off" spellCheck={false} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="GitHub URL" name="githubUrl"><input inputMode="url" autoCapitalize="off" spellCheck={false} value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} /></Field>
        <Field label="WhatsApp URL" name="whatsappUrl"><input inputMode="url" autoCapitalize="off" spellCheck={false} value={form.whatsappUrl} onChange={(e) => set('whatsappUrl', e.target.value)} /></Field>
        <Field label="LinkedIn URL" name="linkedinUrl"><input inputMode="url" autoCapitalize="off" spellCheck={false} value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} /></Field>
        <Field label="Twitter/X URL" name="twitterUrl"><input inputMode="url" autoCapitalize="off" spellCheck={false} value={form.twitterUrl} onChange={(e) => set('twitterUrl', e.target.value)} /></Field>
        <Field label="Resume URL" name="resumeUrl"><input inputMode="url" autoCapitalize="off" spellCheck={false} value={form.resumeUrl} onChange={(e) => set('resumeUrl', e.target.value)} /></Field>
        <Field label="Resume download filename" hint="Shown to visitors when they download the CV, without .pdf" name="resumeFileName">
          <input value={form.resumeFileName} onChange={(e) => set('resumeFileName', e.target.value)} />
        </Field>
        <Field label="Formspree form ID" hint="From formspree.io, only the part after f/" name="formspreeId"><input value={form.formspreeId} onChange={(e) => set('formspreeId', e.target.value)} /></Field>
      </div>

      <h2 id="settings-pulse">Live status (Pulse)</h2>
      <p className="admin-hint">Shows an Online or Down chip on projects whose live URL matches a monitor on your Pulse public status page. Leave both empty to turn it off. Pulse must allow this site in its CORS_ORIGIN setting.</p>
      <div className="admin-grid-2">
        <Field label="Pulse API URL" hint="Your Pulse backend, for example https://pulse-api.onrender.com" name="pulseApiUrl"><input inputMode="url" autoCapitalize="off" spellCheck={false} value={form.pulseApiUrl || ''} onChange={(e) => set('pulseApiUrl', e.target.value)} /></Field>
        <Field label="Status page token" hint="The share token of a Pulse status page that lists your project monitors" name="pulseStatusToken"><input value={form.pulseStatusToken || ''} onChange={(e) => set('pulseStatusToken', e.target.value)} /></Field>
      </div>
      <FileUploader
        label="CV / resume file"
        value={form.resumeUrl}
        onChange={(v) => set('resumeUrl', v)}
        folder="resume"
        accept="application/pdf"
        hint="Uploads and replaces public/cv.pdf directly, the URL above updates automatically."
      />

      <h2 id="settings-seo">SEO</h2>
      <div className="admin-grid-2">
        <Field label="Site URL" name="siteUrl"><input inputMode="url" autoCapitalize="off" spellCheck={false} value={form.siteUrl} onChange={(e) => set('siteUrl', e.target.value)} /></Field>
      </div>
      <Field label="Meta description" name="metaDescription" hint={`${String(form.metaDescription || '').length} characters. 70 to 160 works best in Google.`}>
        <textarea rows={2} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
      </Field>

    </div>
  )
}
