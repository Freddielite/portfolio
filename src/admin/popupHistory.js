// A sheet or the search takes one step in the browser history when it opens on a phone,
// so the phone's Back button closes it instead of leaving the screen. Leaving it by
// choosing something has to take that step back FIRST and only then carry on (go to the
// section, open the post), or the two history changes trip over each other.
export function leavePopup(then) {
  if (!window.history.state?.adminPopup) {
    then?.()
    return
  }
  let finished = false
  const done = () => {
    if (finished) return
    finished = true
    window.removeEventListener('popstate', done)
    clearTimeout(timer)
    then?.()
  }
  const timer = setTimeout(done, 400) // in case the browser never reports the step back
  window.addEventListener('popstate', done)
  window.history.back()
}
