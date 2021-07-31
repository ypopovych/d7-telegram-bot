import { RedisClient } from './async'
import { Storage } from '../types'

const STORAGE_PREFIX = "storage"
const CONFIG_KEY = "config"

export interface RedisStorageOptions {
    keyPrefix?: string,
}

export class RedisStorage implements Storage {
    readonly redis: RedisClient
    readonly keyPrefix: string

    constructor(redis: RedisClient, options?: RedisStorageOptions) {
        this.redis = redis
        this.keyPrefix = options?.keyPrefix ?? ""
    }

    getValues(chatId: string, module: string, keys: string[]): Promise<any[]> {
        const newKeys = keys.map(k => this.valuePrefix(chatId, module, k))
        return this.redis
            .mgetAsync(newKeys)
            .then(vals => vals.map(v => JSON.parse(v)))
    }

    hasValue(chatId: string, module: string, key: string): Promise<boolean> {
        return this.redis
            .existsAsync(this.valuePrefix(chatId, module, key))
            .then(num => num == 1)
    }

    incValue(chatId: string, module: string, key: string, amount: number): Promise<number> {
        return this.redis.incrbyAsync(this.valuePrefix(chatId, module, key), amount)
    }

    decValue(chatId: string, module: string, key: string, amount: number): Promise<number> {
        return this.redis.decrbyAsync(this.valuePrefix(chatId, module, key), amount)
    }

    setValues(chatId: string, module: string, values: Record<string, any>, ttl?: number): Promise<void> {
        return Object
            .entries(values)
            .map(([key, val]) => [
                this.valuePrefix(chatId, module, key),
                JSON.stringify(val)
            ])
            .reduce((multi, [key, val]) => {
                const set = multi.set(key, val)
                return !!ttl ? set.expire(key, ttl) : set
            }, this.redis.multi())
            .execAsync().then()
    }

    updateValues(chatId: string, module: string, values: Record<string, any>, ttl?: number): Promise<Record<string, any>> {
        const kvs = Object.entries(values)
            .map(([key, val]) => [
                key,
                this.valuePrefix(chatId, module, key),
                JSON.stringify(val)
            ])
        return kvs.reduce((multi, [_, path, val]) => {
                const upd = multi.get(path).set(path, val)
                return !!ttl ? upd.expire(path, ttl) : upd
            }, this.redis.multi())
            .execAsync()
            .then((results) => {
                const increment = !!ttl ? 3 : 2
                const response: Record<string, any> = {}
                for (let i = 0; i < results.length; i += increment) {
                    response[kvs[i/increment][0]] = JSON.parse(results[i])
                }
                return response
            })
    }

    removeValues(chatId: string, module: string, keys: string[]): Promise<void> {
        const newKeys = keys.map(k => this.valuePrefix(chatId, module, k))
        return this.redis.delAsync(newKeys).then()
    }

    getVoteValues<V>(chatId: string, module: string, poll: string, options: number): Promise<V[][]> {
        const keys = Array.from({ length: options }, (_, id) => {
            return this.valuePrefix(chatId, module, poll + "_opt_" + id)
        })
        return keys
            .reduce((multi, key) => multi.smembers(key), this.redis.multi())
            .execAsync()
            .then((votes: any[][]) => votes.map(voters => voters.map(v => JSON.parse(v))))
    }

    putVoteValue<V>(
        chatId: string, module: string, poll: string, value: V, selected: number, options: number
    ): Promise<{changed: boolean, votes: V[][]}> {
        const keys = Array.from({ length: options }, (_, id) => {
            return this.valuePrefix(chatId, module, poll + "_opt_" + id)
        })
        const val = JSON.stringify(value)
        const multi = keys.reduce((multi, key, idx) => {
            return idx === selected ? multi.sadd(key, val) : multi.srem(key, val)
        }, this.redis.multi())
        return keys
            .reduce((multi, key) => multi.smembers(key), multi)
            .execAsync()
            .then(responses => {
                const changed = responses
                    .slice(0, responses.length - options)
                    .reduce((chd, val: number) => chd || (val > 0), false)
                return { changed, votes: responses.slice(responses.length - options) as string[][] }
            })
            .then(({changed, votes}) => {
                return {
                    changed,
                    votes: votes.map(voters => voters.map(v => JSON.parse(v)))
                }
            })
    }

    clearVoteValues(chatId: string, module: string, poll: string, options: number): Promise<void> {
        const keys = Array.from({ length: options }, (_, id) => poll + "_opt_" + id)
        return this.removeValues(chatId, module, keys)
    }

    getConfigValue(chatId: string, module: string, key: string): Promise<any> {
        return this.redis
            .hgetAsync(this.configPrefix(chatId, module), key)
            .then(val => JSON.parse(val))
    }

    setConfigValue(chatId: string, module: string, key: string, value: any): Promise<void> {
        return this.redis
            .hsetAsync(this.configPrefix(chatId, module), key, JSON.stringify(value))
            .then()
    }

    private prefix(chatId: string, key: string): string {
        return this.keyPrefix + "__" + chatId + "__" + key
    }

    private valuePrefix(chatId: string, module: string, key: string) {
        return this.prefix(chatId, STORAGE_PREFIX + "__" + module + "__" + key)
    }

    private configPrefix(chatId: string, module: string): string {
        return this.prefix(chatId, CONFIG_KEY + "__" + module)
    }
}