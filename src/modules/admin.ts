import { Telegraf } from "telegraf"
import { TelegrafContext, MatchedContext, MethodConfig } from "../types"
import { Module, ModuleContext, NullModule } from "../module"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { addSuperAdmin } from "../utils/superadmin"
import { setTitle, restoreTitle } from "../utils/title"

export type Config = {
    admin: MethodConfig
    superadmin: MethodConfig
}

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export class AdminModule extends Module<NullModule, Context, Config> {
    readonly name = "admin"
    static readonly moduleName = "admin"

    private async command_admin(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.admin)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        const title = ctx.message.text.substring(ctx.message.text.indexOf(' ') + 1)
    
        await this.makeAdmin(
            ctx, ctx.message.reply_to_message!.from!.id,
            ctx.message.reply_to_message!.from!.username, title
        )
    
        await ctx.reply(
            `Користувачу ${ctx.message.reply_to_message!.from!.first_name} присвоєно плашку "${title}"`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_superadmin(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.superadmin)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.from)) return
        if (!await ensureMessageCitation(ctx)) return
    
        const title = ctx.message.text.substring(ctx.message.text.indexOf(' ') + 1)
    
        await this.makeSuperAdmin(
            ctx, ctx.message.reply_to_message!.from!.id, 
            ctx.message.reply_to_message!.from!.username, title
        )
    
        await ctx.reply(
            `Користувачу ${ctx.message.reply_to_message!.from!.first_name} присвоєно плашку "${title}"`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async event_onChatMember(ctx: MatchedContext<TelegrafContext, 'chat_member'>, next: () => Promise<void>) {
        // Restores title if user was banned / set to RO
        if (
            ["kicked", "left", "restricted"].includes(ctx.chatMember.old_chat_member.status) 
            && ["member", "administrator"].includes(ctx.chatMember.new_chat_member.status)
        ) {
            await restoreTitle(ctx.telegram, this.storage, String(ctx.chat.id), ctx.chatMember.new_chat_member.user.id)
        }
        await next()
    }

    static readonly defaultConfig: Config = { 
        admin: { shortCall: false },
        superadmin: { shortCall: false }
    }
    
    init(): void {
        this.context.bot.command("admin", this.command_admin.bind(this))
        this.context.bot.command("superadmin", this.command_superadmin.bind(this))
        this.context.bot.on("chat_member", this.event_onChatMember.bind(this))
    }

    deinit(): void {}

    title(): string { return 'Адміни та Супер-Адміни' }
    commands(): Record<string, string> {
        return {
            'admin': 'зробити користувача адміном й встановити плашку',
            'superadmin': 'зробити користувача супер-адміном й встановити плашку'
        }
    }

    // Helpers
    private makeAdmin(
        ctx: MatchedContext<TelegrafContext, 'text'>, userId: number, userName: string | undefined, title: string
    ): Promise<void> {
        return setTitle(ctx.telegram, this.storage, String(ctx.chat.id), userId, userName, title)
    }

    private async makeSuperAdmin(
        ctx: MatchedContext<TelegrafContext, 'text'>, userId: number,
        userName: string | undefined , title: string
    ): Promise<void> {
        await this.makeAdmin(ctx, userId, userName, title)
        await addSuperAdmin(ctx.telegram, this.storage, String(ctx.chat.id), userId, userName)
    }
}
