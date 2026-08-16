import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import ImageUploader from '../ImageUploader.jsx'
import FileUploader from '../FileUploader.jsx'

function Field({ label, hint, children }) {
  return (
    <div className="admin-field">
      <label className="admin-label">{label}</label>
      {children}
      {hint && <p className="admin-hint">{hint}</p>}
    </div>
  )
}

export default function SiteSettingsEditor() {
  const { data, loading, saving, error, savedAt, save } = useAdminContent('siteSettings')
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  if (loading || !form) return <p className="admin-hint">Loading…</p>

  const dirty = JSON.stringify(form) !== JSON.stringify(data)
  useUnsavedChangesWarning(dirty)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="admin-section">
      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(form)} />

      <h2>Identity</h2>
      <div className="admin-grid-2">
        <Field label="Full name"><input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Short name (nav, mobile)"><input value={form.shortName} onChange={(e) => set('shortName', e.target.value)} /></Field>
        <Field label="Initials (logo mark)"><input value={form.initials} onChange={(e) => set('initials', e.target.value)} /></Field>
        <Field label="Tagline"><input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
        <Field label="Company"><input value={form.company} onChange={(e) => set('company', e.target.value)} /></Field>
        <Field label="Location"><input value={form.location} onChange={(e) => set('location', e.target.value)} /></Field>
        <Field label="Timezone"><input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} /></Field>
      </div>

      <ImageUploader label="Profile photo" value={form.photo} onChange={(v) => set('photo', v)} folder="profile" />

      <h2>Availability</h2>
      <div className="admin-grid-2">
        <Field label="Availability label"><input value={form.availability} onChange={(e) => set('availability', e.target.value)} /></Field>
        <Field label="Response time"><input value={form.responseTime} onChange={(e) => set('responseTime', e.target.value)} /></Field>
        <Field label="Best way to reach you"><input value={form.bestWayToReach} onChange={(e) => set('bestWayToReach', e.target.value)} /></Field>
        <Field label="Show as available for work?">
          <label className="admin-checkbox">
            <input type="checkbox" checked={!!form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} />
            Currently available
          </label>
        </Field>
      </div>

      <h2>Hero section</h2>
      <div className="admin-grid-2">
        <Field label="Greeting name"><input value={form.heroGreetingName} onChange={(e) => set('heroGreetingName', e.target.value)} /></Field>
        <Field label="Headline line 1"><input value={form.heroHeadlineLine1} onChange={(e) => set('heroHeadlineLine1', e.target.value)} /></Field>
        <Field label="Headline highlight (line 2)"><input value={form.heroHeadlineHighlight} onChange={(e) => set('heroHeadlineHighlight', e.target.value)} /></Field>
      </div>
      <Field label="Hero subtext">
        <textarea rows={3} value={form.heroSub} onChange={(e) => set('heroSub', e.target.value)} />
      </Field>

      <h2>About section</h2>
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
        <Field label="Focus areas"><input value={form.focusAreas} onChange={(e) => set('focusAreas', e.target.value)} /></Field>
        <Field label="Works with"><input value={form.worksWith} onChange={(e) => set('worksWith', e.target.value)} /></Field>
        <Field label="Engagement"><input value={form.engagement} onChange={(e) => set('engagement', e.target.value)} /></Field>
      </div>

      <h2>Testimonials</h2>
      <Field label="Show testimonials section on the live site?">
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={!!form.showTestimonials}
            onChange={(e) => set('showTestimonials', e.target.checked)}
          />
          Show testimonials
        </label>
      </Field>

      <h2>Contact</h2>
      <Field label="Contact headline"><input value={form.contactHeadline} onChange={(e) => set('contactHeadline', e.target.value)} /></Field>
      <Field label="Contact subtext"><textarea rows={2} value={form.contactSub} onChange={(e) => set('contactSub', e.target.value)} /></Field>
      <div className="admin-grid-2">
        <Field label="Email"><input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="GitHub URL"><input value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} /></Field>
        <Field label="WhatsApp URL"><input value={form.whatsappUrl} onChange={(e) => set('whatsappUrl', e.target.value)} /></Field>
        <Field label="LinkedIn URL"><input value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} /></Field>
        <Field label="Twitter/X URL"><input value={form.twitterUrl} onChange={(e) => set('twitterUrl', e.target.value)} /></Field>
        <Field label="Resume URL"><input value={form.resumeUrl} onChange={(e) => set('resumeUrl', e.target.value)} /></Field>
        <Field label="Resume download filename" hint="Shown to visitors when they download the CV, without .pdf">
          <input value={form.resumeFileName} onChange={(e) => set('resumeFileName', e.target.value)} />
        </Field>
        <Field label="Formspree form ID" hint="From formspree.io, only the part after f/"><input value={form.formspreeId} onChange={(e) => set('formspreeId', e.target.value)} /></Field>
      </div>
      <FileUploader
        label="CV / resume file"
        value={form.resumeUrl}
        onChange={(v) => set('resumeUrl', v)}
        folder="resume"
        accept="application/pdf"
        hint="Uploads and replaces public/cv.pdf directly — the URL above updates automatically."
      />

      <h2>SEO</h2>
      <div className="admin-grid-2">
        <Field label="Site URL"><input value={form.siteUrl} onChange={(e) => set('siteUrl', e.target.value)} /></Field>
      </div>
      <Field label="Meta description">
        <textarea rows={2} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
      </Field>

      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(form)} />
    </div>
  )
}
