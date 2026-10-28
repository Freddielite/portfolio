import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import CheckIcon from '../components/CheckIcon.jsx'

const ToastContext = createContext({ toast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [item, setItem] = useState(null)
  const timer = useRef(0)

  const toast = useCallback((message) => {
    clearTimeout(timer.current)
    setItem({ id: Date.now(), message })
    timer.current = setTimeout(() => setItem(null), 2600)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {item && (
          <div className="toast" key={item.id}>
            <CheckIcon />
            <span>{item.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
