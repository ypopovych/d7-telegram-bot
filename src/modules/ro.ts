import { Telegraf } from "telegraf"
import { TelegrafContext, MatchedContext, MethodConfig } from "../types"
import { Module, ModuleContext, NullModule } from "../module"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { disableRo, enableRo } from "../utils/ro"

export type Config = {
    ro_24h: MethodConfig
    ro_7d: MethodConfig
    unro: MethodConfig
}

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export class RoModule extends Module<NullModule, Context, Config> {
    readonly name = "ro"
    static readonly moduleName = "ro"

    private async command_ro_24h(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ro_24h)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await enableRo(
            ctx.telegram, this.storage, String(ctx.chat.id),
            ctx.message.reply_to_message!.from!.id, 86400,
            ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name, ''
        )
    }

    private async command_ro_7d(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ro_7d)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await enableRo(
            ctx.telegram, this.storage, String(ctx.chat.id),
            ctx.message.reply_to_message!.from!.id, 86400 * 7,
            ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name, ''
        )
    }

    private async command_unro(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.unro)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        await disableRo(
            ctx.telegram, this.storage, String(ctx.chat.id),
            ctx.message.reply_to_message!.from!.id, 
            ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name
        )
    }

    static readonly defaultConfig: Config = {
        ro_24h: { shortCall: false },
        ro_7d: { shortCall: false },
        unro: { shortCall: false }
    }

    init(): void {
        this.context.bot.command("ro_24h", this.command_ro_24h.bind(this))
        this.context.bot.command("ro_7d", this.command_ro_7d.bind(this))
        this.context.bot.command("unro", this.command_unro.bind(this))
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
