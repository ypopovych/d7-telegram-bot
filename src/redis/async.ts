import { RedisClient, Multi } from "redis"
import { promisify } from 'util'
const redisCommands = require("redis-commands")

promisify_object(RedisClient.prototype, redisCommands.list)
promisify_object(Multi.prototype, ['exec', 'exec_atomic'])

function promisify_object(obj: any, methods: string[]) {
  methods.forEach((method) => {
    if (obj[method])
      obj[method + 'Async'] = promisify(obj[method])
  })
}

export interface AsyncOverloadedKeyCommand<T, U> {
  (key: string, arg1: T, arg2: T, arg3: T, arg4: T, arg5: T, arg6: T): Promise<U>
  (key: string, arg1: T, arg2: T, arg3: T, arg4: T, arg5: T): Promise<U>
  (key: string, arg1: T, arg2: T, arg3: T, arg4: T): Promise<U>
  (key: string, arg1: T, arg2: T, arg3: T): Promise<U>
  (key: string, arg1: T, arg2: T): Promise<U>
  (key: string, arg1: T | T[]): Promise<U>
  (key: string, ...args: Array<T>): Promise<U>
  (...args: Array<string | T>): Promise<U>
}

interface AsyncOverloadedSetCommand<T, U> {
  (key: string, arg1: T, arg2: T, arg3: T, arg4: T, arg5: T, arg6: T): Promise<U>
  (key: string, arg1: T, arg2: T, arg3: T, arg4: T, arg5: T): Promise<U>
  (key: string, arg1: T, arg2: T, arg3: T, arg4: T): Promise<U>
  (key: string, arg1: T, arg2: T, arg3: T): Promise<U>
  (key: string, arg1: T, arg2: T): Promise<U>
  (key: string, arg1: T | { [key: string]: T } | T[]): Promise<U>
  (key: string, ...args: Array<T>): Promise<U>
  (args: [string, ...T[]]): Promise<U>
}

interface AsyncOverloadedCommand<T, U> {
  (arg1: T, arg2: T, arg3: T, arg4: T, arg5: T, arg6: T): Promise<U>
  (arg1: T, arg2: T, arg3: T, arg4: T, arg5: T): Promise<U>
  (arg1: T, arg2: T, arg3: T, arg4: T): Promise<U>
  (arg1: T, arg2: T, arg3: T): Promise<U>
  (arg1: T, arg2: T | T[]): Promise<U>
  (arg1: T | T[]): Promise<U>
  (...args: Array<T>): Promise<U>
}

declare module 'redis' {
    interface RedisClient {
        lrangeAsync(key: string, start: number, stop: number): Promise<string[]>
        hgetallAsync(key: string): Promise<{ [key: string]: string }>
        hgetAsync(key: string, field: string): Promise<string>
        hsetAsync: AsyncOverloadedSetCommand<string, number>
        hmgetAsync: AsyncOverloadedKeyCommand<string, string[]>
        hmsetAsync: AsyncOverloadedSetCommand<string | number, 'OK'>
        hdelAsync: AsyncOverloadedKeyCommand<string, number>
        existsAsync: AsyncOverloadedCommand<string, number>
        mgetAsync: AsyncOverloadedCommand<string, string[]>
        delAsync: AsyncOverloadedCommand<string, number>
        incrbyAsync(key: string, increment: number): Promise<number>
        decrbyAsync(key: string, decrement: number): Promise<number>
        hincrbyAsync(key: string, field: string, increment: number): Promise<number>
        hexistsAsync(key: string, field: string): Promise<number>
    }
    interface Multi {
        execAsync(): Promise<any[]>
        exec_atomicAsync(): Promise<any[]>
    }
}

export { RedisClient, Multi }