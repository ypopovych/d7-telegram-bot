import { Module, ModuleContext } from "../module"
import { Telegraf } from "telegraf"
import { TelegrafContext, MethodConfig, MatchedContext, AsyncTaskRunner } from "../types"
import { isBotCommand } from "../utils/validators"
import { getMinutesString } from "../utils/string"

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
    taskRunner: AsyncTaskRunner
}

export type Config = {
    help: MethodConfig & { enabled: boolean, timeout: number }
}

export class HelpModule extends Module<any, Context, Config> {
    readonly name = "help"
    static readonly moduleName = "help"
    static readonly defaultConfig: Config = {
        help: { shortCall: true, enabled: true, timeout: 180 }
    }

    private modules!: { title: string; commands: Record<string, string> }[]

    init() {
        if (this.config.help.enabled) {
            this.context.bot.help(this.command_help.bind(this))
            this.modules = this.resolver.all()
                .filter((mod) => typeof mod.title === "function" && typeof mod.commands === "function")
                .map((mod): { title: string; commands: Record<string, string> } => {
                    return { title: mod.title(), commands: mod.commands() }
                }).filter((val) => Object.keys(val.commands).length > 0 )
        }
    }

    deinit(): void {}

    private async command_help(ctx: MatchedContext<TelegrafContext, 'text'>) {
        if (!isBotCommand(ctx, this.config.help)) return
        if (!await this.ensureCooldown(ctx.chat.id)) return
        const timeout = this.config.help.timeout
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
        lines.push(`<i>це повідомлення буде видалено автоматично через ${getMinutesString(timeout)}</i>`)
        const message = await ctx.replyWithHTML(
            lines.join("\n"),
            {
                reply_to_message_id: ctx.message.message_id,
            }
        )
        await this.updateCooldown(ctx.chat.id)
        const chatId = ctx.chat.id, messageId = message.message_id, telegram = ctx.telegram
        this.context.taskRunner.once(timeout, () => telegram.deleteMessage(chatId, messageId))
    }

    title(): string { return "Довідка" }
    commands(): Record<string, string> {
        return { "help": "Показати цю довідку" }
    }

    readonly LAST_MESSAGE_DATE_KEY = "last_message_date"

    private async ensureCooldown(chatId: number): Promise<boolean> {
        const cooldown = this.config.help.timeout
        const lastMessage = await this.storage
            .getValues(String(chatId), this.name, [this.LAST_MESSAGE_DATE_KEY])
            .then((vals) => vals[0] ?? 0)
        return (Date.now() - lastMessage) >= (cooldown * 1000)
    }

    private updateCooldown(chatId: number): Promise<void> {
        return this.storage.setValues(
            String(chatId), this.name,
            { [this.LAST_MESSAGE_DATE_KEY]: Date.now() }
        )
    }
}