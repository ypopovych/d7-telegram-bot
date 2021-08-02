
import { TelegramError } from 'telegraf'

type TaskInfo = { cb: () => Promise<any>; resolve: (val: any) => void, reject: (err: any) => void }

export class TelegramCallThrottler {
    private lastCall: number
    private timeout: number
    private timer?: any
    private tasks: TaskInfo[]

    constructor(readonly defaultTimeout: number = 1000) {
        this.lastCall = Date.now() - defaultTimeout
        this.timeout = defaultTimeout
        this.tasks = []
    }

    private async exec(task: TaskInfo): Promise<boolean> {
        this.timeout = this.defaultTimeout
        try {
            const result = await task.cb()
            task.resolve(result)
        } catch(error: any) {
            if (error.hasOwnProperty("response") && error.hasOwnProperty("on")) {
                const err = error as TelegramError
                if (err.code === 429) {
                    this.timeout = (err.parameters?.retry_after ?? 1) * 1000 + 100
                    return false
                } else {
                    task.reject(error)
                }
            } else {
                task.reject(error)
            }
        }
        return true
    }

    private async tryRun() {
        if (this.timer !== undefined) return;
        if (this.tasks.length === 0) return;
        const interval = (this.lastCall + this.timeout) - Date.now()
        if (interval <= 0) {
            if(await this.exec(this.tasks[0])) {
                this.tasks.shift()
            }
            this.lastCall = Date.now()
            this.tryRun()
        } else {
            this.timer = setTimeout(() => {
                this.timer = undefined
                this.tryRun()
            }, interval)
        }
    }

    throttle<R>(cb: () => Promise<R>): Promise<R> {
        return new Promise((resolve, reject) => {
            this.tasks.push({cb, resolve, reject})
            if (this.tasks.length === 1) {
                this.tryRun()
            }
        })
    }

    stop() {
        if (this.timer !== undefined) {
            clearTimeout(this.timer)
            this.timer === undefined
        }
        for (let task of this.tasks) {
            task.reject(new Error("Throttler stopped"))
        }
        this.tasks = []
    }
}