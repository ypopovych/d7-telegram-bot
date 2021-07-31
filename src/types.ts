import { Context as BContext, NarrowedContext, Types } from 'telegraf'

export interface Storage {
    getValues(chatId: string, module: string, keys: string[]): Promise<any[]>
    hasValue(chatId: string, module: string, key: string): Promise<boolean>
    incValue(chatId: string, module: string, key: string, amount: number): Promise<number>
    decValue(chatId: string, module: string, key: string, amount: number): Promise<number>
    setValues(chatId: string, module: string, values: Record<string, any>, ttl?: number): Promise<void>
    updateValues(chatId: string, module: string, values: Record<string, any>, ttl?: number): Promise<Record<string, any>>
    removeValues(chatId: string, module: string, keys: string[]): Promise<void>

    putVoteValue<V>(
      chatId: string, module: string, poll: string, value: V, selected: number, options: number
    ): Promise<{changed: boolean, votes: V[][]}>
    clearVoteValues(chatId: string, module: string, poll: string, options: number): Promise<void>

    getConfigValue(chatId: string, module: string, key: string): Promise<any>
    setConfigValue(chatId: string, module: string, key: string, value: any): Promise<void>
}

export interface AsyncTaskRunner {
    once(wait: number, task: () => any): symbol
    cancel(taskId: symbol): void
}

export interface TelegrafContext extends BContext {}

export type MatchedContext<
  C extends BContext,
  T extends Types.UpdateType | Types.MessageSubType
> = NarrowedContext<C, Types.MountMap[T]>

export interface MethodConfig {
  readonly shortCall: boolean
}
