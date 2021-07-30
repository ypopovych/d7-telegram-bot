import { Module, ModuleContext } from "../module"
import { Telegraf } from "telegraf"
import { TelegrafContext, MethodConfig, MatchedContext, AsyncTaskRunner } from "../types"

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
    taskRunner: AsyncTaskRunner
}

export type Config = MethodConfig & { enabled: boolean }

export class HelpModule extends Module<any, Context, Config> {
    readonly name = "help"
    static readonly moduleName = "help"
    static readonly defaultConfig: Config = {
        shortCall: true,
        enabled: true
    }

    private modules!: { title: string; commands: Record<string, string> }[]

    init() {
        if (this.config.enabled) {
            this.context.bot.help(this.command_help.bind(this))
            this.modules = this.resolver.all()
                .filter((mod) => typeof mod.title === "function" && typeof mod.commands === "function")
                .map((mod): { title: string; commands: Record<string, string> } => {
                    return { title: mod.title(), commands: mod.commands() }
                }).filter((val) => Object.keys(val.commands).length > 0 )
        }
    }

    async command_help(ctx: MatchedContext<TelegrafContext, 'text'>) {
        const lines = this.modules.reduce((lines, cmd) => {
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
        this.context.taskRunner.once(180, () => telegram.deleteMessage(chatId, messageId))
    }

    title(): string { return "Довідка" }
    commands(): Record<string, string> {
        return { "help": "Показати цю довідку" }
    }
}