// Match the spelling app's short, locally synthesized feedback sounds.
export function createFeedbackAudio() {
  let context: AudioContext | null = null
  let generation = 0
  const active = new Set<OscillatorNode>()
  function stop() {
    generation++
    for (const node of active) { try { node.stop() } catch { /* Already ended. */ } }
    active.clear()
  }
  async function play(correct: boolean) {
    stop()
    const current = generation
    try {
      context ??= new AudioContext()
      if (context.state === 'suspended') {
        await Promise.race([context.resume(), new Promise(resolve => setTimeout(resolve, 500))])
      }
      if (current !== generation || context.state !== 'running') return
      const notes = correct ? [523.25, 659.25, 783.99, 1046.5] : [311.13, 277.18]
      await new Promise<void>(resolve => {
      // A device that interrupts audio must not block the next question.
      const fallback = setTimeout(resolve, 1000)
      notes.forEach((frequency, i) => {
        const oscillator = context!.createOscillator()
        const gain = context!.createGain()
        oscillator.connect(gain); gain.connect(context!.destination)
        oscillator.type = correct ? 'sine' : 'sawtooth'
        const start = context!.currentTime + i * (correct ? .1 : .13)
        const duration = correct ? .18 : .2
        oscillator.frequency.setValueAtTime(frequency, start)
        gain.gain.setValueAtTime(correct ? .22 : .18, start)
        gain.gain.exponentialRampToValueAtTime(.001, start + duration)
        active.add(oscillator)
        oscillator.onended = () => {
          active.delete(oscillator); oscillator.disconnect(); gain.disconnect()
          if (i === notes.length - 1) { clearTimeout(fallback); resolve() }
        }
        oscillator.start(start); oscillator.stop(start + duration)
      })
      })
    } catch { /* Visual feedback remains available without device audio. */ }
  }
  function dispose() { stop(); if (context) void context.close().catch(() => {}); context = null }
  return { play, stop, dispose }
}
