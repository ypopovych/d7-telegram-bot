export interface IModule<Deps extends IModule<any> = any, Context extends {} = {}> {
    readonly name: string
    readonly resolver: Resolver<Deps>
    readonly context: Context

    init(): void
}

export interface IFactory<Deps extends IModule, Mod extends IModule<Deps, Context>, Context extends {}> {
    readonly moduleName: string
    new (resolver: Resolver<Deps>, context: Context): Mod
}

export class Resolver<Modules extends IModule> {
    readonly modules: Record<string, Modules> = {}

    add<M extends Modules, D extends IModule>(mod: M, fact: IFactory<D, M, any>) {
        this.modules[fact.moduleName] = mod
    }

    get<M extends Modules, D extends IModule>(fact: IFactory<D, M, any>): M {
        return this.modules[fact.moduleName] as M
    }

    all(): Modules[] {
        return Object.values(this.modules)
    }

    init() {
        for (const inst of this.all()) { inst.init() }
    }
}

export class NullModule implements IModule<NullModule, {}> {
    readonly resolver!: Resolver<NullModule>
    readonly context!: {}
    readonly name = "NullModule"
    init() {}
}

export class Bootstrapper<Modules extends IModule, Context extends {}> {
    private factories: IFactory<any, any, any>[] = []
    //private resolver: Resolver<Modules> = new Resolver()

    protected constructor() {}

    static empty(): Bootstrapper<NullModule, {}> {
        return new Bootstrapper()
    }

    registered(): IFactory<any, any, any>[] {
        return this.factories
    }

    add<
        C extends {},
        D extends Modules, M extends IModule<D, C>
    >(fact: IFactory<D, M, C>): Bootstrapper<Modules | M, Context & C> {
        this.factories.push(fact)
        return this
    }

    bootstrap(context: Context): Resolver<Modules> {
        const instances: IModule[] = []
        const resolver: Resolver<Modules> = new Resolver();
        for (const fact of this.factories) {
            const instance = new fact(resolver, context)
            resolver.add(instance, fact)
            instances.push(instance)
        }
        return resolver
    }
}
