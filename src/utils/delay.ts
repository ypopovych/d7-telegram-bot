import { AsyncTaskRunner as IAsyncTaskRunner } from '../types'

type Task = { startDate: number, task: () => any }

export class AsyncTaskRunner implements IAsyncTaskRunner {
    private tasks: Map<symbol, Task>
    private timer?: any 

    constructor() {
        this.tasks = new Map()
    }

    start() {
        if (this.timer) this.stop()
        this.timer = setInterval(this.tick.bind(this), 1000)
    }

    stop() {
        if (this.timer) clearInterval(this.timer)
        this.timer = undefined
    }

    private tick() {
        const now = Date.now()

        const waitingTasks: Map<symbol, Task> = new Map()
        for (const [id, task] of this.tasks.entries()) {
            if (task.startDate > now) {
                waitingTasks.set(id, task)
            } else {
                task.task()
            }
        }

        this.tasks = waitingTasks
    }

    once(wait: number, task: () => any): symbol {
        const id: symbol = Symbol()
        this.tasks.set(id, { startDate: Date.now() + (wait * 1000), task })
        return id
    }

    cancel(task: symbol): void {
        this.tasks.delete(task)
    }
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}