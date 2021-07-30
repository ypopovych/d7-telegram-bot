import { Telegraf } from "telegraf"
import { TelegrafContext, MatchedContext, MethodConfig } from "../types"
import { Module, ModuleContext, NullModule } from "../module"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { banUser, unbanUser } from "../utils/ban"

export type Config = {
    ban: MethodConfig
    ban_24h: MethodConfig
    unban: MethodConfig
}

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export class BanModule extends Module<NullModule, Context, Config> {
    readonly name = "ban"
    static readonly moduleName = "ban"

    private async command_ban(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ban)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await banUser(ctx.telegram, String(ctx.chat.id), ctx.message.reply_to_message!.from!.id, Date.now() / 1000)
    
        await ctx.reply(
            `Користувач ${ctx.message.reply_to_message!.from!.first_name} полетів у бан`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_ban_24h(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ban_24h)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await banUser(ctx.telegram, String(ctx.chat.id), ctx.message.reply_to_message!.from!.id, Date.now() / 1000 + 86400)
    
        await ctx.reply(
            `Користувач ${ctx.message.reply_to_message!.from!.first_name} полетів у бан на 24 години`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_unban(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.unban)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await unbanUser(ctx.telegram, String(ctx.chat.id), ctx.message.reply_to_message!.from!.id)
    
        await ctx.reply(
            `Користувач ${ctx.message.reply_to_message!.from!.first_name} розбанений`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    static readonly defaultConfig: Config = {
        ban: { shortCall: false },
        ban_24h: { shortCall: false },
        unban: { shortCall: false }
    }

    init(): void {
        this.context.bot.command("ban", this.command_ban.bind(this))
        this.context.bot.command("ban_24h", this.command_ban_24h.bind(this))
        this.context.bot.command("unban", this.command_unban.bind(this))
    }

    title(): string { return 'Банхаммер' }
    commands(): Record<string, string> {
        return {
            'ban': 'забанити користувача назавжди',
            'ban_24h': 'забанити користувача на 24 години',
            'unban': 'розбанити користувача',
        }
    }
}
