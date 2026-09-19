// Web Audio API Synthesizer (Zero external dependencies, instant zero-latency feedback)

export function playTactileStampSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === "suspended") {
      ctx.resume()
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(160, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.14)
    gain.gain.setValueAtTime(0.45, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.14)
  } catch {
    // audio blocked or unsupported
  }
}

export function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === "suspended") {
      ctx.resume()
    }
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      const startTime = ctx.currentTime + idx * 0.08
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.28, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + 0.45)
    })
  } catch {
    // audio blocked
  }
}

