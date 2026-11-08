import { useState } from 'react'
import { PortableText } from '@portabletext/react'
import { useToast } from '../context/ToastContext.jsx'

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const blockText = (b) => (b.children || []).map((c) => c.text || '').join('')

function CodeBlock({ value }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  async function copy() {
    try {
      await navigator.clipboard.writeText(value.code || '')
      setCopied(true)
      toast('Code copied')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="code-block">
      <div className="code-block-bar">
        <span>{value.language || 'code'}</span>
        <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre><code>{value.code}</code></pre>
    </div>
  )
}

// Two side-by-side groups of blocks. Stacks to one column on narrow screens.
function Columns({ value }) {
  const ratio = ['narrow-left', 'narrow-right'].includes(value.ratio) ? ` is-${value.ratio}` : ''
  return (
    <div className={`post-columns${ratio}`}>
      <div className="post-col"><PortableText value={value.left || []} components={portableComponents} /></div>
      <div className="post-col"><PortableText value={value.right || []} components={portableComponents} /></div>
    </div>
  )
}

// Shared by the public blog and the admin's live preview, so what you see while
// writing is exactly what visitors get.
export const portableComponents = {
  block: {
    h2: ({ children, value }) => <h2 id={slugify(blockText(value))}>{children}</h2>,
    h3: ({ children, value }) => <h3 id={slugify(blockText(value))}>{children}</h3>,
  },
  marks: {
    link: ({ children, value }) => {
      const external = /^https?:\/\//.test(value?.href || '')
      return (
        <a href={value?.href} {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
          {children}
        </a>
      )
    },
  },
  types: {
    code: CodeBlock,
    columns: Columns,
    image: ({ value }) => (
      <figure className="post-figure">
        <img src={value.url} alt={value.alt || ''} loading="lazy" />
        {value.alt && <figcaption>{value.alt}</figcaption>}
      </figure>
    ),
  },
}
