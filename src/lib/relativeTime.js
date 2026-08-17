const UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

export function relativeTime(dateInput) {
  const date = new Date(dateInput)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  for (const [unit, unitSeconds] of UNITS) {
    const count = Math.floor(seconds / unitSeconds)
    if (count >= 1) return `${count} ${unit}${count > 1 ? 's' : ''} ago`
  }
  return 'just now'
}
