import { Storage } from './types'
import { IFactory, IModule, Resolver, Bootstrapper } from './bootstrapper'
import { Configuration } from './config'

export interface ModuleContext {
  config: Configuration
  storage: Storage
}

export interface ModuleFactory<
  Deps extends IModule, Mod extends IModule<Deps, Context>, Context extends ModuleContext, Config extends {}
> extends IFactory<Deps, Mod, Context> {
  readonly defaultConfig: Config
}

type Factory<Deps extends IModule, Context extends ModuleContext, Config extends {}> = 
  ModuleFactory<Deps, Module<Deps, Context, Config>, Context, Config>

export abstract class Module<
  Deps extends IModule, Context extends ModuleContext, Config extends {}
> implements IModule<Deps, Context> {
  abstract readonly name: string
  readonly config: Config
  readonly storage: Storage

  constructor(public resolver: Resolver<Deps>, public context: Context) {
    this.config = context.config.module(this.constructor as Factory<Deps, Context, Config>)
    this.storage = context.storage
  }

  abstract init(): void;
  abstract deinit(): void;

  getConfigValue(chatId: number, key: string): Promise<any> {
    return this.storage.getConfigValue(String(chatId), this.name, key)
  }

  setConfigValue(chatId: number, key: string, value: any): Promise<void> {
    return this.storage.setConfigValue(String(chatId), this.name, key, value)
  }

  abstract title(): string
  abstract commands(): Record<string, string>
}

export class NullModule extends Module<any, ModuleContext, {}> {
  readonly name = "NullModule"
  init() {}
  deinit() {}
  title() { return "" }
  commands() { return {} }
}

export class ModuleBootstrapper<
  Modules extends Module<any, ModuleContext, any>, Context extends ModuleContext
> extends Bootstrapper<Modules, Context> {

  static empty(): ModuleBootstrapper<NullModule, ModuleContext> {
    return new ModuleBootstrapper()
  }

  registered(): Factory<any, any, any>[] {
      return super.registered() as Factory<any, any, any>[]
  }

  module<
      C extends ModuleContext, Config extends {},
      D extends Modules, M extends Module<D, C, Config>
  >(fact: ModuleFactory<D, M, C, Config>): ModuleBootstrapper<Modules | M, Context & C> {
      return super.add(fact) as ModuleBootstrapper<Modules | M, Context & C>
  }
}