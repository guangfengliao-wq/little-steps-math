// Visual feedback only: answer entry never waits for an animation to finish.
export function createDigitFlight() {
  const active = new Set<HTMLElement>()
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let generation = 0
  const colors = ['#ffd700', '#fff176', '#ffa726', '#a78bfa', '#f472b6', '#86efac', '#7dd3fc']

  function clear() {
    generation++
    for (const element of active) {
      for (const animation of element.getAnimations()) animation.cancel()
      element.remove()
    }
    active.clear()
  }

  function particle(text: string, x: number, y: number, frames: Keyframe[], duration: number, delay = 0, color = '#ffd700') {
    const element = document.createElement('span')
    element.className = text === '★' ? 'digit-flight digit-flight-star' : 'digit-flight'
    element.textContent = text
    element.setAttribute('aria-hidden', 'true')
    Object.assign(element.style, { left: `${x}px`, top: `${y}px`, color, opacity: '0' })
    document.body.append(element)
    active.add(element)
    const animation = element.animate(frames, { duration, delay, fill: 'forwards', easing: 'linear' })
    const remove = () => { element.remove(); active.delete(element) }
    animation.finished.then(remove, remove)
  }

  function fly(digit: number, source: DOMRect, target: HTMLElement, token: number) {
    if (token !== generation || motion.matches || !target.isConnected) return
    const end = target.getBoundingClientRect()
    const sx = source.left + source.width / 2, sy = source.top + source.height / 2
    const dx = end.left + end.width / 2 - sx, dy = end.top + end.height / 2 - sy
    const duration = 280
    particle(String(digit), sx, sy, [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * .82}px), calc(-50% + ${dy * .82}px)) scale(1.2)`, opacity: 1, offset: .82 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.8)`, opacity: 0 },
    ], duration)
    for (let i = 1; i <= 8; i++) {
      const t = i / 10
      for (let j = 0; j < 2; j++) {
        const drift = (Math.random() - .5) * 46
        particle('★', sx + dx * t, sy + dy * t, [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${drift}px), calc(-50% + 25px)) scale(0) rotate(90deg)`, opacity: 0 },
        ], 180, duration * t, colors[(i + j) % colors.length])
      }
    }
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4
      particle('★', sx + dx, sy + dy, [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * 32}px), calc(-50% + ${Math.sin(angle) * 32}px)) scale(0)`, opacity: 0 },
      ], 160, duration, colors[i % colors.length])
    }
  }

  window.addEventListener('resize', clear)
  window.addEventListener('scroll', clear, true)
  motion.addEventListener('change', clear)
  return {
    fly, clear, token: () => generation,
    dispose() {
      clear()
      window.removeEventListener('resize', clear)
      window.removeEventListener('scroll', clear, true)
      motion.removeEventListener('change', clear)
    },
  }
}
