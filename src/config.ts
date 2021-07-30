import * as fs from 'fs'
import { RedisStorageOptions } from "./redis/storage"
import { ModuleFactory } from './module'
import merge from 'ts-deepmerge'

type RedisConfig = { 
    url: string
    options?: RedisStorageOptions
}

type WebHookConfig = {
    domain: string
    host: string
    port: number
    pathPrefix?: string | null
    tls?: { key: string; cert: string; selfSigned: boolean, ca?: string | string[] } | null
}

type Config = {
    botToken: string
    redis: RedisConfig,
    webHook?: WebHookConfig,
    modules?: Record<string, Record<string, any> | undefined>
}

export class Configuration {
    readonly botToken: string
    readonly redis: RedisConfig
    readonly webHook?: WebHookConfig
    private modules: Record<string, Record<string, any> | undefined> 

    constructor(filePath: string) {
        const config: Config = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }))
        this.botToken = config.botToken!
        this.redis = config.redis!
        if (config.webHook && config.webHook.domain) {
            this.webHook = {
                domain: config.webHook.domain,
                host: config.webHook.host ?? "0.0.0.0",
                port: config.webHook.port ?? 443,
                pathPrefix: (config.webHook.pathPrefix === "") ? undefined : config.webHook.pathPrefix,
                tls: config.webHook.tls
            }
        }
        this.modules = config.modules ?? {}
    }

    module<Config extends {}>(fact: ModuleFactory<any, any, any, Config>): Config {
        return merge(this.modules[fact.moduleName] ?? {}, fact.defaultConfig) as Config
    }

    static generateDefaultConfig(modules: ModuleFactory<any, any, any, any>[]): Config {
        const modConfig: Record<string, Record<string, any> | undefined> = {}
        for (const mod of modules) {
            modConfig[mod.moduleName] = mod.defaultConfig
        }
        return {
            botToken: "",
            redis: { url: "redis://127.0.0.1:6379", options: { "keyPrefix": "d7bot" } },
            webHook: { domain: "", host: "0.0.0.0", port: 443, pathPrefix: "/telegram", tls: null  },
            modules: modConfig
        }
    }
}