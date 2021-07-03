import { Telegraf } from 'telegraf'
import merge from 'ts-deepmerge'
import { Context, Storage } from './types'

export interface ModuleFactory<Config extends Record<string, any>> {
    new (storage: Storage, config: Partial<Config>): Module<Config>
    readonly moduleName: string
    readonly defaultConfig: Config
  }
  
  export abstract class Module<Config extends Record<string, any>> {
    readonly storage: Storage
    readonly config!: Config
  
    static readonly moduleName: string
  
    constructor(storage: Storage, config: Partial<Config>) {
      this.storage = storage
      const cfg = (this.constructor as ModuleFactory<Config>).defaultConfig
      this.config = merge(cfg, config) as Config
    }

    moduleName(): string {
      return (this.constructor as ModuleFactory<Config>).moduleName
    }
  
    getConfigValue(chatId: number, key: string): Promise<any> {
      return this.storage.getConfigValue(String(chatId), this.moduleName(), key)
    }
  
    setConfigValue(chatId: number, key: string, value: any): Promise<void> {
      return this.storage.setConfigValue(String(chatId), this.moduleName(), key, value)
    }
  
    abstract title(): string
    abstract commands(): Record<string, string>
    abstract register(bot: Telegraf<Context>): void
  }