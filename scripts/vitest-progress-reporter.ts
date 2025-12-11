import type {
  Reporter,
  File,
  Task,
  TaskResultPack,
  RunnerTaskEventPack,
} from 'vitest'

export default class ProgressReporter implements Reporter {
  start = 0
  total = 0
  finished = 0
  processed = new Set<string>()
  started = new Set<string>()
  tasksById = new Map<string, Task>()

  onInit() {
    this.start = Date.now()
  }

  onCollected(files: File[]) {
    this.total = files.length
    this.tasksById.clear()

    for (const file of files) {
      this.collectTask(file)
    }

    console.log(`
📊  Test Suite Progress Tracker Initialized`)
    console.log(`📝  Found ${this.total} test files to run. `)
    console.log(`⏳  Estimating completion time...
`)
  }

  onTaskUpdate(packs: TaskResultPack[], _events: RunnerTaskEventPack[]) {
    let updated = false

    for (const pack of packs) {
      const [taskId, result] = pack
      if (!result) continue

      const task = this.tasksById.get(taskId)
      if (!task) continue

      task.result = result

      if (!this.isFileTask(task)) continue
      const { id, result: fileResult, name } = task
      if (!id || !fileResult) continue

      // Log start of file execution
      if (
        fileResult.state === 'run' ||
        fileResult.state === 'pass' ||
        fileResult.state === 'fail'
      ) {
        if (!this.started.has(id)) {
          this.started.add(id)
          // Clean up the name to be relative/shorter if possible
          const shortName = name.split('/').slice(-2).join('/')
          console.log(
            `▶️  [${this.started.size}/${this.total}] Running: ${shortName}`
          )
        }
      }

      // Check if file is completely done
      // The file.result.state will be 'pass' or 'fail' when the file execution is complete
      if (fileResult.state === 'pass' || fileResult.state === 'fail') {
        if (!this.processed.has(id)) {
          this.processed.add(id)
          this.finished++
          updated = true
        }
      }
    }

    if (updated) {
      this.logProgress()
    }
  }

  logProgress() {
    if (this.finished === 0) return

    const now = Date.now()
    const elapsedMs = now - this.start
    const avgTimePerFile = elapsedMs / this.finished
    const remainingFiles = this.total - this.finished
    const estRemainingMs = avgTimePerFile * remainingFiles

    const elapsedStr = this.formatTime(elapsedMs)
    const estStr = this.formatTime(estRemainingMs)
    const percent = Math.round((this.finished / this.total) * 100)

    console.log(
      `⏱️  [${percent}%] ${this.finished}/${this.total} files. ` +
        `Elapsed: ${elapsedStr}. ` +
        `Est. Remaining: ${estStr}`
    )
  }

  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  private collectTask(task: Task) {
    this.tasksById.set(task.id, task)

    if (!this.isSuiteTask(task)) return

    for (const child of task.tasks) {
      this.collectTask(child)
    }
  }

  private isSuiteTask(task: Task): task is Task & {
    tasks: Task[]
  } {
    return 'tasks' in task && Array.isArray(task.tasks)
  }

  private isFileTask(task: Task): task is File {
    // Vitest marks file-level tasks as suites with a filepath
    return task.type === 'suite' && 'filepath' in task
  }
}
