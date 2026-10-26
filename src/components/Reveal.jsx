import useReveal from '../hooks/useReveal.js'

export default function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, on] = useReveal()
  return (
    <Tag
      ref={ref}
      className={`rv ${on ? 'on' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
