import { Job } from "./Job"

class LastRunner {
  running?: Promise<unknown>
  next?: Job

  add<R>(fn: () => R) {
    const job = new Job(fn)
    this.next?.cancel()
    this.next = job
    this.run()
    return job.result
  }
  async run() {
    if (this.running) return
    const job = this.next
    if (!job) return
    this.next = undefined
    try {
      await (this.running = job.exec())
    } finally {
      this.running = undefined
      this.run()
    }
  }
}

export function createLastRunner<T extends () => R, R>(): (fn: T) => Promise<R> {
  const runner = new LastRunner()
  return (fn) => runner.add(fn)
}
