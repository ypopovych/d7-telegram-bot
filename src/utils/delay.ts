
export type Task = { startDate: number, task: () => any }

export class DelayTaskRunner {
    private tasks: Array<Task>
    private timer?: any 

    constructor() {
        this.tasks = []
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
        const outdated = this.tasks.filter(task => task.startDate <= now)
        this.tasks = this.tasks.filter(task => task.startDate > now)
        for (let task of outdated) {
            task.task()
        }
    }

    once(wait: number, task: () => any) {
        this.tasks.push({ startDate: Date.now() + (wait * 1000), task })
    }
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}