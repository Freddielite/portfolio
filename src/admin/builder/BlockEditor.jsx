import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Toolbar, { editorHandlers } from './Toolbar.jsx'
import { uploadImage } from '../imageUpload.js'
import {
  RATIOS,
  blocksToItems,
  findContainer,
  findItem,
  getList,
  insertAfter,
  insertInto,
  isContainerId,
  itemsToBlocks,
  moveItem,
  newItem,
  nudgeItem,
  removeItem,
  replaceItem,
  setList,
  splitTextItem,
  textLabel,
  updateItem,
} from './blockModel.js'

const Ctx = createContext(null)
const useEditor = () => useContext(Ctx)

const LABELS = { image: 'Image', code: 'Code', columns: 'Columns' }
const labelOf = (item) => (item.kind === 'text' ? textLabel(item.text) : LABELS[item.kind])
const snippet = (item) => {
  if (item.kind === 'text') return item.text.trim().slice(0, 60) || 'Empty text'
  if (item.kind === 'image') return item.alt || item.url.split('/').pop() || 'Image'
  if (item.kind === 'code') return item.code.trim().split('\n')[0].slice(0, 60) || 'Code'
  return 'Two columns'
}

// A textarea that grows with its content, so a block never needs its own scrollbar.
function AutoTextarea({ innerRef, value, className, ...rest }) {
  const local = useRef(null)
  const ref = innerRef || local
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value, ref])
  return <textarea ref={ref} value={value} className={className} rows={1} {...rest} />
}

function TextItem({ item }) {
  const ed = useEditor()
  const ref = useRef(null)
  useEffect(() => {
    if (ed.focusId === item.id && ref.current) {
      ref.current.focus()
      ed.clearFocus()
    }
  }, [ed, item.id])
  const handlers = editorHandlers({
    run: (fn) => ed.runOn(ref.current, item.id, fn),
    addImageFile: (file) => ed.addImages([file], { afterId: item.id }),
  })
  return (
    <AutoTextarea
      innerRef={ref}
      className="blk-textarea"
      value={item.text}
      placeholder="Write here. ## makes a heading, - a bullet, > a quote."
      onChange={(e) => ed.setText(item.id, e.target.value)}
      onFocus={() => ed.setActive(ref.current, item.id)}
      onBlur={() => ed.splitText(item.id)}
      {...handlers}
    />
  )
}

function ImageItem({ item }) {
  const ed = useEditor()
  const fileRef = useRef(null)
  const src = item.preview || item.url
  return (
    <div className="blk-image">
      {src ? <img src={src} alt="" /> : <p className="admin-hint">No image yet.</p>}
      <input
        className="blk-input"
        value={item.alt}
        placeholder="Caption (shown under the image, and used as its description for Google)"
        onChange={(e) => ed.patch(item.id, { alt: e.target.value })}
      />
      <button type="button" className="blk-small" onClick={() => fileRef.current?.click()}>Replace image</button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) ed.replaceImage(item.id, f)
        }}
      />
    </div>
  )
}

function CodeItem({ item }) {
  const ed = useEditor()
  return (
    <div className="blk-code">
      <input className="blk-input" value={item.language} placeholder="Language (js, html, bash), optional" onChange={(e) => ed.patch(item.id, { language: e.target.value.trim() })} />
      <AutoTextarea className="blk-textarea blk-mono" value={item.code} placeholder="Paste your code here" spellCheck={false} onChange={(e) => ed.patch(item.id, { code: e.target.value })} />
    </div>
  )
}

function ColumnsItem({ item }) {
  const ed = useEditor()
  return (
    <div className="blk-columns">
      <label className="blk-ratio">
        Layout
        <select value={item.ratio} onChange={(e) => ed.patch(item.id, { ratio: e.target.value }, true)}>
          {RATIOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className={`blk-cols is-${item.ratio}`}>
        {[0, 1].map((side) => (
          <div key={side} className="blk-col">
            <span className="blk-col-label">{side === 0 ? 'Left' : 'Right'}</span>
            <Container cid={`${item.id}:${side}`} list={item.cols[side]} compact />
          </div>
        ))}
      </div>
    </div>
  )
}

function Block({ item }) {
  const ed = useEditor()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }
  return (
    <div ref={setNodeRef} style={style} className={`blk blk-kind-${item.kind}`}>
      <div className="blk-bar">
        <button ref={setActivatorNodeRef} type="button" className="blk-handle" aria-label="Drag to move this block" title="Drag to move" {...attributes} {...listeners}>⋮⋮</button>
        <span className="blk-label">{labelOf(item)}</span>
        <span className="admin-spacer" />
        <button type="button" className="blk-icon" aria-label="Move up" title="Move up" onClick={() => ed.nudge(item.id, -1)}>↑</button>
        <button type="button" className="blk-icon" aria-label="Move down" title="Move down" onClick={() => ed.nudge(item.id, 1)}>↓</button>
        <button type="button" className="blk-icon blk-del" aria-label="Delete this block" title="Delete" onClick={() => ed.remove(item.id)}>✕</button>
      </div>
      <div className="blk-body">
        {item.kind === 'text' && <TextItem item={item} />}
        {item.kind === 'image' && <ImageItem item={item} />}
        {item.kind === 'code' && <CodeItem item={item} />}
        {item.kind === 'columns' && <ColumnsItem item={item} />}
      </div>
    </div>
  )
}

function AddRow({ cid, compact }) {
  const ed = useEditor()
  return (
    <div className="blk-add" role="group" aria-label="Add a block">
      <button type="button" onClick={() => ed.add('text', cid)}>＋ Text</button>
      <button type="button" onClick={() => ed.pickImages({ cid })}>＋ Image</button>
      <button type="button" onClick={() => ed.add('code', cid)}>＋ Code</button>
      {!compact && <button type="button" onClick={() => ed.add('columns', cid)}>＋ Columns</button>}
    </div>
  )
}

function Container({ cid, list, compact }) {
  const { setNodeRef, isOver } = useDroppable({ id: cid })
  return (
    <div ref={setNodeRef} className={`blk-list${isOver ? ' is-over' : ''}`}>
      <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {list.map((item) => <Block key={item.id} item={item} />)}
      </SortableContext>
      {!list.length && <p className="blk-empty">{compact ? 'Drag a block here, or add one below.' : 'Nothing here yet. Add a block below.'}</p>}
      <AddRow cid={cid} compact={compact} />
    </div>
  )
}

export default function BlockEditor({ body, onBody }) {
  const [items, setItems] = useState(() => {
    const start = blocksToItems(body)
    return start.length ? start : [newItem('text')]
  })
  const itemsRef = useRef(items)
  const onBodyRef = useRef(onBody)
  onBodyRef.current = onBody
  const history = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [focusId, setFocusId] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const areaRef = useRef(null)
  const activeId = useRef(null)
  const dragStart = useRef(null)
  const fileRef = useRef(null)
  const pickTarget = useRef({ cid: 'root' })

  // Every change goes through here, so the form always has the latest body, even
  // when it arrives later (an upload finishing).
  function apply(fn, record = true) {
    const prev = itemsRef.current
    const next = fn(prev)
    if (next === prev) return
    if (record) {
      history.current.push(prev)
      if (history.current.length > 40) history.current.shift()
      setCanUndo(true)
    }
    itemsRef.current = next
    setItems(next)
    onBodyRef.current(itemsToBlocks(next))
  }

  function undo() {
    const prev = history.current.pop()
    setCanUndo(history.current.length > 0)
    if (!prev) return
    itemsRef.current = prev
    setItems(prev)
    onBodyRef.current(itemsToBlocks(prev))
  }

  async function addImages(files, { cid = 'root', afterId = null } = {}) {
    const images = [...files].filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setError(null)
    setBusy(true)
    let after = afterId
    for (const file of images) {
      try {
        const { path } = await uploadImage(file, 'blog')
        const item = newItem('image', { url: path, alt: '', preview: URL.createObjectURL(file) })
        apply((it) => (after ? insertAfter(it, after, item) : insertInto(it, getList(it, cid) ? cid : 'root', undefined, item)))
        after = item.id
      } catch (err) {
        setError(err.message)
      }
    }
    setBusy(false)
  }

  async function replaceImage(id, file) {
    setError(null)
    setBusy(true)
    try {
      const { path } = await uploadImage(file, 'blog')
      apply((it) => updateItem(it, id, { url: path, preview: URL.createObjectURL(file) }))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  function runOn(el, id, fn) {
    if (!el) return
    const r = fn(el.value, el.selectionStart, el.selectionEnd)
    apply((it) => updateItem(it, id, { text: r.value }), false)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(r.start, r.end)
    })
  }

  const ctx = {
    focusId,
    clearFocus: () => setFocusId(null),
    setActive: (el, id) => {
      areaRef.current = el
      activeId.current = id
    },
    setText: (id, text) => apply((it) => updateItem(it, id, { text }), false),
    patch: (id, patch, record = false) => apply((it) => updateItem(it, id, patch), record),
    // A text block that now holds several paragraphs turns into several blocks.
    splitText: (id) => {
      const it = findItem(itemsRef.current, id)
      if (!it || it.kind !== 'text') return
      const parts = splitTextItem(it)
      if (parts.length > 1) apply((all) => replaceItem(all, id, parts))
    },
    remove: (id) => apply((it) => removeItem(it, id)),
    nudge: (id, dir) => apply((it) => nudgeItem(it, id, dir)),
    add: (kind, cid) => {
      const item = newItem(kind)
      apply((it) => insertInto(it, getList(it, cid) ? cid : 'root', undefined, item))
      if (kind === 'text') setFocusId(item.id)
    },
    pickImages: (target) => {
      pickTarget.current = target
      fileRef.current?.click()
    },
    addImages,
    replaceImage,
    runOn,
  }

  // ---------- drag and drop ----------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Pick the smallest thing under the pointer: a block inside a column beats the
  // column, which beats the columns group, which beats the whole page. A columns
  // group can only be dropped between top-level blocks.
  function collision(args) {
    const cur = itemsRef.current
    const dragged = findItem(cur, args.active.id)
    let hits = pointerWithin(args)
    if (!hits.length) hits = rectIntersection(args)
    if (dragged?.kind === 'columns') hits = hits.filter((h) => h.id === 'root' || findContainer(cur, h.id) === 'root')
    if (!hits.length) return []
    const area = (h) => {
      const r = args.droppableRects.get(h.id)
      return r ? r.width * r.height : Infinity
    }
    return [[...hits].sort((a, b) => area(a) - area(b))[0]]
  }

  function onDragStart({ active }) {
    dragStart.current = itemsRef.current
    setActiveDragId(active.id)
  }

  function onDragOver({ active, over }) {
    if (!over) return
    const cur = itemsRef.current
    const from = findContainer(cur, active.id)
    const to = isContainerId(over.id) ? over.id : findContainer(cur, over.id)
    if (!from || !to || from === to) return
    const list = getList(cur, to)
    if (!list) return
    let index = list.length
    if (!isContainerId(over.id)) {
      const overIndex = list.findIndex((i) => i.id === over.id)
      const moved = active.rect.current.translated
      const below = moved && over.rect && moved.top + moved.height / 2 > over.rect.top + over.rect.height / 2
      index = overIndex + (below ? 1 : 0)
    }
    apply((it) => moveItem(it, active.id, to, index), false)
  }

  function onDragEnd({ active, over }) {
    setActiveDragId(null)
    const cur = itemsRef.current
    if (over) {
      const c = findContainer(cur, active.id)
      const oc = isContainerId(over.id) ? over.id : findContainer(cur, over.id)
      if (c && c === oc) {
        const list = getList(cur, c)
        const oldIndex = list.findIndex((i) => i.id === active.id)
        const newIndex = isContainerId(over.id) ? list.length - 1 : list.findIndex((i) => i.id === over.id)
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          apply((it) => setList(it, c, arrayMove(getList(it, c), oldIndex, newIndex)), false)
        }
      }
    }
    // One undo step for the whole drag.
    if (dragStart.current && dragStart.current !== itemsRef.current) {
      history.current.push(dragStart.current)
      setCanUndo(true)
    }
    dragStart.current = null
  }

  function onDragCancel() {
    setActiveDragId(null)
    if (dragStart.current && dragStart.current !== itemsRef.current) {
      itemsRef.current = dragStart.current
      setItems(dragStart.current)
      onBodyRef.current(itemsToBlocks(dragStart.current))
    }
    dragStart.current = null
  }

  const dragItem = useMemo(() => (activeDragId ? findItem(items, activeDragId) : null), [activeDragId, items])

  return (
    <Ctx.Provider value={ctx}>
      <div
        className="blk-editor"
        onDragOver={(e) => {
          if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault()
        }}
        onDrop={(e) => {
          const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'))
          if (files.length) {
            e.preventDefault()
            addImages(files, { cid: 'root' })
          }
        }}
      >
        <Toolbar
          area={areaRef}
          text=""
          onText={(v) => activeId.current && ctx.setText(activeId.current, v)}
          onImages={(files) => addImages(files, { afterId: activeId.current && findItem(itemsRef.current, activeId.current) ? activeId.current : null })}
          uploading={busy}
        />
        <p className="admin-hint blk-hint">
          Drag the ⋮⋮ handle to move a block, or use the arrows. Put blocks inside Columns to place them side by side. Drop photos here to add them.
        </p>
        <DndContext sensors={sensors} collisionDetection={collision} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
          <Container cid="root" list={items} />
          <DragOverlay>
            {dragItem ? (
              <div className="blk-ghost">
                <strong>{labelOf(dragItem)}</strong>
                <span>{snippet(dragItem)}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <div className="blk-foot">
          <button type="button" className="blk-small" disabled={!canUndo} onClick={undo}>Undo last block change</button>
          {busy && <span className="admin-hint">Uploading…</span>}
          {error && <span className="admin-error">{error}</span>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files || [])]
            e.target.value = ''
            if (files.length) addImages(files, pickTarget.current)
          }}
        />
      </div>
    </Ctx.Provider>
  )
}
