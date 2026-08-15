import { Helmet } from 'react-helmet-async'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function SEO({ title, description, image, path = '', type = 'website', noIndex = false }) {
  const s = useSiteSettings()
  const fullTitle = title ? `${title} · ${s.name}` : `${s.name} · ${s.tagline}`
  const desc = description || s.metaDescription
  const url = `${s.siteUrl.replace(/\/$/, '')}${path}`
  const img = image
    ? (image.startsWith('http') ? image : `${s.siteUrl.replace(/\/$/, '')}${image}`)
    : `${s.siteUrl.replace(/\/$/, '')}${s.photo}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  )
}
