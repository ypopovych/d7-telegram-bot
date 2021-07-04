import { Telegraf } from "telegraf"
import { Context, MatchedContext, MethodConfig } from "../types"
import { Module } from "../module"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { disableRo, enableRo } from "../utils/ro"

export interface RoModuleConfig {
    ro_24h: MethodConfig
    ro_7d: MethodConfig
    unro: MethodConfig
}

export class RoModule extends Module<RoModuleConfig> {
    static readonly moduleName = "ro"

    private async command_ro_24h(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ro_24h)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await enableRo(
            ctx.telegram, this.storage, String(ctx.chat.id),
            ctx.message.reply_to_message!.from!.id, 86400,
            ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name, ''
        )
    }

    private async command_ro_7d(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ro_7d)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await enableRo(
            ctx.telegram, this.storage, String(ctx.chat.id),
            ctx.message.reply_to_message!.from!.id, 86400 * 7,
            ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name, ''
        )
    }

    private async command_unro(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.unro)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await disableRo(
            ctx.telegram, this.storage, String(ctx.chat.id),
            ctx.message.reply_to_message!.from!.id, 
            ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name
        )
    }

    static readonly defaultConfig: RoModuleConfig = {
        ro_24h: { shortCall: false },
        ro_7d: { shortCall: false },
        unro: { shortCall: false }
    }

    register(bot: Telegraf<Context>): void {
        bot.command("ro_24h", this.command_ro_24h.bind(this))
        bot.command("ro_7d", this.command_ro_7d.bind(this))
        bot.command("unro", this.command_unro.bind(this))
    }

    title(): string { return 'Банхаммерчик' }
    commands(): Record<string, string> {
        return {
            'ro_24h': 'відправити в РО на 24 години',
            'ro_7d': 'відправити в РО на 7 діб',
            'unro': 'витягнути з РО'
        }
    }
}
