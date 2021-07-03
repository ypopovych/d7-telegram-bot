import { Context as BContext, NarrowedContext, Types } from 'telegraf'

export interface Storage {
    getValues(chatId: string, module: string, keys: string[]): Promise<any[]>
    hasValue(chatId: string, module: string, key: string): Promise<boolean>
    incValue(chatId: string, module: string, key: string, amount: number): Promise<number>
    decValue(chatId: string, module: string, key: string, amount: number): Promise<number>
    setValues(chatId: string, module: string, values: Record<string, any>, ttl?: number): Promise<void>
    removeValues(chatId: string, module: string, keys: string[]): Promise<void>

    getConfigValue(chatId: string, module: string, key: string): Promise<any>
    setConfigValue(chatId: string, module: string, key: string, value: any): Promise<void>
}

export interface Context extends BContext {
    storage: Storage
}

export type MatchedContext<
  C extends BContext,
  T extends Types.UpdateType | Types.MessageSubType
> = NarrowedContext<C, Types.MountMap[T]>