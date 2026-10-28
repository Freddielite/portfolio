// Self-drawing check mark used for success moments (copied, sent).
export default function CheckIcon({ size = 20 }) {
  return (
    <svg className="check" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle className="check-ring" cx="12" cy="12" r="10" />
      <path className="check-tick" d="M7 12.5l3.2 3.2L17 9" />
    </svg>
  )
}
