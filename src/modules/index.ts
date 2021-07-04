import { Telegraf } from "telegraf"
import { Context, Storage, MatchedContext, MethodConfig, AsyncTaskRunner } from "../types"
import { ModuleFactory } from "../module"
import { AdminModule } from "./admin"
import { AutoRoModule } from "./auto_ro"
import { BanModule } from "./ban"
import { NukeModule } from "./nuke"
import { RoVotingModule } from "./ro_voting"
import { RoModule } from "./ro"
import { XkcdModule } from "./xkcd"

const ALL_MODULES: ModuleFactory<any>[] = [
    AdminModule, AutoRoModule, BanModule, NukeModule, RoVotingModule, RoModule, XkcdModule
]

const DEFAULT_HELP_CONFIG: HelpMethodConfig = {
    shortCall: true,
    enabled: true
}

type HelpMethodConfig = MethodConfig & { enabled: boolean }

type HelpModuleConfig = {
    title: string
    commands: Record<string, string>
}

async function command_help(
    commands: HelpModuleConfig[], taskRunner: AsyncTaskRunner, ctx: MatchedContext<Context, 'text'>
): Promise<void> {
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
    lines.push("")
    lines.push("<i>це повідомлення буде видалено автоматично через 3 хвилини</i>")
    const message = await ctx.replyWithHTML(
        lines.join("\n"),
        {
            reply_to_message_id: ctx.message.message_id,
        }
    )
    const chatId = ctx.chat.id, messageId = message.message_id, telegram = ctx.telegram
    taskRunner.once(180, () => telegram.deleteMessage(chatId, messageId))
}

export function registerModulesIn(
    bot: Telegraf<Context>, storage: Storage, taskRunner: AsyncTaskRunner, configs: Record<string, any>
) {
    let helpInfo: HelpModuleConfig[] = []
    let helpConfig: HelpMethodConfig = Object.assign({}, DEFAULT_HELP_CONFIG, configs["help"] ?? {})
    for (let mFact of ALL_MODULES) {
        const module = new mFact(storage, taskRunner, configs[mFact.moduleName] ?? {})
        module.register(bot)
        if (helpConfig.enabled) {
            helpInfo.push({
                title: module.title(),
                commands: module.commands()
            })
        }
    }
    if (helpConfig.enabled) {
        bot.help((ctx: MatchedContext<Context, 'text'>) => command_help(helpInfo, taskRunner, ctx))
    }
}

export function generateDefaultConfig(): Record<string, any> {
    return ALL_MODULES.reduce((cfg, mFact) => {
        cfg[mFact.moduleName] = mFact.defaultConfig
        return cfg
    }, { help: DEFAULT_HELP_CONFIG } as Record<string, any>)
}
