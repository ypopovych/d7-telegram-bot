import { Telegraf } from "telegraf"
import { Context, MatchedContext, MethodConfig } from "../types"
import { Module } from "../module"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { banUser, unbanUser } from "../utils/ban"

export interface BanModuleConfig {
    ban: MethodConfig
    ban_24h: MethodConfig
    unban: MethodConfig
}

export class BanModule extends Module<BanModuleConfig> {
    static readonly moduleName = "ban"

    private async command_ban(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ban)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await banUser(ctx.telegram, String(ctx.chat.id), ctx.message.reply_to_message!.from!.id, Date.now() / 1000)
    
        await ctx.reply(
            `Користувач ${ctx.message.reply_to_message!.from!.first_name} полетів у бан`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_ban_24h(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ban_24h)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await banUser(ctx.telegram, String(ctx.chat.id), ctx.message.reply_to_message!.from!.id, Date.now() / 1000 + 86400)
    
        await ctx.reply(
            `Користувач ${ctx.message.reply_to_message!.from!.first_name} полетів у бан на 24 години`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_unban(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.unban)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await unbanUser(ctx.telegram, String(ctx.chat.id), ctx.message.reply_to_message!.from!.id)
    
        await ctx.reply(
            `Користувач ${ctx.message.reply_to_message!.from!.first_name} розбанений`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    static readonly defaultConfig: BanModuleConfig = {
        ban: { shortCall: false },
        ban_24h: { shortCall: false },
        unban: { shortCall: false }
    }

    register(bot: Telegraf<Context>): void {
        bot.command("ban", this.command_ban.bind(this))
        bot.command("ban_24h", this.command_ban_24h.bind(this))
        bot.command("unban", this.command_unban.bind(this))
    }

    title(): string { return 'Банхаммер' }
    commands(): Record<string, string> {
        return {
            'ban': 'Забанити користувача назавжди',
            'ban_24h': 'Забанити користувача на 24 години',
            'unban': 'Разбанити користувача',
        }
    }
}
