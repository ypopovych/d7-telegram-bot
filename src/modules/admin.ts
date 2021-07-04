import { Telegraf } from "telegraf"
import { Context, MatchedContext, MethodConfig } from "../types"
import { Module } from "../module"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { addSuperAdmin } from "../utils/superadmin"
import { setTitle, restoreTitle } from "../utils/title"

export interface AdminModuleConfig {
    admin: MethodConfig
    superadmin: MethodConfig
}

export class AdminModule extends Module<AdminModuleConfig> {
    static readonly moduleName = "admin"

    private async command_admin(ctx: MatchedContext<Context, 'text'>): Promise<void> {
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

    private async command_superadmin(ctx: MatchedContext<Context, 'text'>): Promise<void> {
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

    private async event_onChatMember(ctx: MatchedContext<Context, 'chat_member'>, next: () => Promise<void>) {
        console.log("CHAT MEMBER UPDATED:", ctx.chatMember)
        if (
            ["kicked", "left", "restricted"].includes(ctx.chatMember.old_chat_member.status) 
            && ctx.chatMember.new_chat_member.status == "member"
        ) {
            await restoreTitle(ctx.telegram, this.storage, String(ctx.chat.id), ctx.chatMember.new_chat_member.user.id)
        }
        await next()
    }

    static readonly defaultConfig: AdminModuleConfig = { 
        admin: { shortCall: false },
        superadmin: { shortCall: false }
    }

    register(bot: Telegraf<Context>): void {
        bot.command("admin", this.command_admin.bind(this))
        bot.command("superadmin", this.command_superadmin.bind(this))
        bot.on("chat_member", this.event_onChatMember.bind(this))
    }

    title(): string { return 'Адміни та Супер-Адміни' }
    commands(): Record<string, string> {
        return {
            'admin': 'зробити користувача адміном й встановити плашку',
            'superadmin': 'зробити користувача супер-адміном й встановити плашку'
        }
    }

    // Helpers
    private makeAdmin(
        ctx: MatchedContext<Context, 'text'>, userId: number, userName: string | undefined, title: string
    ): Promise<void> {
        return setTitle(ctx.telegram, this.storage, String(ctx.chat.id), userId, userName, title)
    }

    private async makeSuperAdmin(
        ctx: MatchedContext<Context, 'text'>, userId: number,
        userName: string | undefined , title: string
    ): Promise<void> {
        await this.makeAdmin(ctx, userId, userName, title)
        await addSuperAdmin(ctx.telegram, this.storage, String(ctx.chat.id), userId, userName)
    }
}
