import { useRef, useState } from 'react'

// Drag-to-reorder for a list kept in React state. Give each row's handle
// `handleProps(i)` and the whole row `dropProps(i)`. On touch screens, where
// drag and drop does not work, the up and down buttons are still there.
export default function useDragReorder(setList) {
  const from = useRef(null)
  const [over, setOver] = useState(null)

  const handleProps = (i) => ({
    draggable: true,
    onDragStart: (e) => {
      from.current = i
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(i))
    },
    onDragEnd: () => {
      from.current = null
      setOver(null)
    },
  })

  const dropProps = (i) => ({
    onDragOver: (e) => {
      if (from.current === null) return
      e.preventDefault()
      if (over !== i) setOver(i)
    },
    onDragLeave: () => setOver((o) => (o === i ? null : o)),
    onDrop: (e) => {
      e.preventDefault()
      const f = from.current
      from.current = null
      setOver(null)
      if (f === null || f === i) return
      setList((l) => {
        const next = [...l]
        const [moved] = next.splice(f, 1)
        next.splice(i, 0, moved)
        return next
      })
    },
  })

  return { handleProps, dropProps, over }
}
