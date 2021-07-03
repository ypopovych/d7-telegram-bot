import { Telegraf } from "telegraf"
import { Context, Storage, MatchedContext } from "../types"
import { ModuleFactory } from "../module"
import { AdminModule } from "./admin"
import { AutoRoModule } from "./auto_ro"
import { BanModule } from "./ban"
import { NukeModule } from "./nuke"
import { RoVotingModule } from "./ro_voting"
import { RoModule } from "./ro"

const ALL_MODULES: ModuleFactory<any>[] = [
    AdminModule, AutoRoModule, BanModule, NukeModule, RoVotingModule, RoModule
]

type HelpModuleConfig = {
    title: string
    commands: Record<string, string>
}

async function command_help(commands: HelpModuleConfig[], ctx: MatchedContext<Context, 'text'>): Promise<void> {
    const lines = commands.reduce((lines, cmd) => {
        lines.push("")
        lines.push(`<b>${cmd.title}</b>`)
        const entries = Object.entries(cmd.commands).map(([cmd, desc]) => {
            return ctx.message.chat.type == "private"
                ? `    /${cmd} - ${desc}`
                : `    /${cmd}@${ctx.botInfo.username} - ${desc}`
        })
        return lines.concat(entries)
    }, ["<b>Список команд:</b>", "<b>=================</b>"])
    await ctx.replyWithHTML(lines.join("\n"), {reply_to_message_id: ctx.message.message_id})
}

export function registerModulesIn(bot: Telegraf<Context>, storage: Storage, configs: Record<string, any>) {
    let helpInfo: HelpModuleConfig[] = []
    for (let mFact of ALL_MODULES) {
        const module = new mFact(storage, configs[mFact.moduleName] ?? {})
        module.register(bot)

        helpInfo.push({
            title: module.title(),
            commands: module.commands()
        })
    }
    bot.help((ctx: MatchedContext<Context, 'text'>) => command_help(helpInfo, ctx))
}

export function generateDefaultConfig(): Record<string, any> {
    return ALL_MODULES.reduce((cfg, mFact) => {
        cfg[mFact.moduleName] = mFact.defaultConfig
        return cfg
    }, {} as Record<string, any>)
}
