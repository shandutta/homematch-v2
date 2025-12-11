import type {
  Reporter,
  File,
  Task,
  TaskResultPack,
  RunnerTaskEventPack,
} from 'vitest'
import fs from 'fs'
import path from 'path'

// Writes per-test start/end timestamps and durations to test-results/vitest-timeline.log
export default class TimestampReporter implements Reporter {
  private logPath = path.join(
    process.cwd(),
    'test-results',
    'vitest-timeline.log'
  )
  private tasksById = new Map<string, Task>()
  private taskFilePath = new Map<string, string>()
  private startTimes = new Map<string, number>()

  onInit() {
    fs.mkdirSync(path.dirname(this.logPath), { recursive: true })
    fs.writeFileSync(
      this.logPath,
      [
        '# Vitest per-test timeline',
        `started=${new Date().toISOString()}`,
        '',
      ].join('\n'),
      'utf8'
    )
  }

  onCollected(files: File[]) {
    this.tasksById.clear()
    this.taskFilePath.clear()
    for (const file of files) {
      this.collectTask(file)
    }
  }

  onTaskUpdate(packs: TaskResultPack[], _events: RunnerTaskEventPack[]) {
    for (const pack of packs) {
      const [taskId, result] = pack
      if (!result) continue

      const task = this.tasksById.get(taskId)
      if (!task || task.type !== 'test') continue

      const timestamp = new Date().toISOString()
      const filePath = this.taskFilePath.get(taskId) || ''

      if (result.state === 'run') {
        this.startTimes.set(taskId, Date.now())
        this.append(`${timestamp} | START | ${task.name} | ${filePath}`)
        continue
      }

      if (
        result.state === 'pass' ||
        result.state === 'fail' ||
        result.state === 'skip' ||
        result.state === 'todo'
      ) {
        const startedAt = this.startTimes.get(taskId)
        const duration =
          typeof startedAt === 'number'
            ? Math.max(0, Date.now() - startedAt)
            : typeof (result as { duration?: number }).duration === 'number'
              ? Math.max(0, (result as { duration: number }).duration)
              : 0

        this.append(
          `${timestamp} | ${result.state.toUpperCase()} | ${duration}ms | ${task.name} | ${filePath}`
        )
        this.startTimes.delete(taskId)
      }
    }
  }

  private append(line: string) {
    fs.appendFileSync(this.logPath, `${line}\n`, 'utf8')
  }

  private collectTask(task: Task, currentFilePath?: string) {
    this.tasksById.set(task.id, task)

    const nextFilePath =
      this.isFileTask(task) && 'filepath' in task
        ? (task as File).filepath
        : currentFilePath

    if (nextFilePath) {
      this.taskFilePath.set(task.id, nextFilePath)
    }

    if (this.isSuiteTask(task)) {
      for (const child of task.tasks) {
        this.collectTask(child, nextFilePath)
      }
    }
  }

  private isSuiteTask(task: Task): task is Task & { tasks: Task[] } {
    return 'tasks' in task && Array.isArray(task.tasks)
  }

  private isFileTask(task: Task): task is File {
    return 'filepath' in task
  }
}
