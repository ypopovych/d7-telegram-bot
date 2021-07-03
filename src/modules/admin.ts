import { Telegraf } from "telegraf"
import { Context, MatchedContext } from "../types"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { addSuperAdmin } from "../utils/superadmin"
import { setTitle, restoreTitle } from "../utils/title"

const ADMIN_COMMAND = "admin"
const SUPERADMIN_COMMAND = "superadmin"

function makeAdmin(ctx: MatchedContext<Context, 'text'>, userId: number, title: string): Promise<void> {
    return setTitle(ctx, userId, title)
}

async function makeSuperAdmin(ctx: MatchedContext<Context, 'text'>, userId: number, title: string): Promise<void> {
    await makeAdmin(ctx, userId, title)
    await addSuperAdmin(ctx, userId)
}

async function command_admin(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    const title = ctx.message.text.substring(ctx.message.text.indexOf(' ') + 1)

    await makeAdmin(ctx, ctx.message.reply_to_message!.from!.id, title)

    await ctx.reply(
        `Користувачу ${ctx.message.reply_to_message!.from!.first_name} присвоєно плашку "${title}"`,
        { reply_to_message_id: ctx.message.message_id }
    )
}

async function command_superadmin(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    const title = ctx.message.text.substring(ctx.message.text.indexOf(' ') + 1)

    await makeSuperAdmin(ctx, ctx.message.reply_to_message!.from!.id, title)

    await ctx.reply(
        `Користувачу ${ctx.message.reply_to_message!.from!.first_name} присвоєно плашку "${title}"`,
        { reply_to_message_id: ctx.message.message_id }
    )
}

async function event_onChatMember(ctx: MatchedContext<Context, 'chat_member'>, next: () => Promise<void>) {
    console.log("CHAT MEMBER UPDATED:", ctx.chatMember)
    if (
        ["kicked", "left", "restricted"].includes(ctx.chatMember.old_chat_member.status) 
        && ctx.chatMember.new_chat_member.status == "member"
    ) {
        await restoreTitle(ctx, ctx.chatMember.new_chat_member.user.id)
    }
    await next()
}

export function register(bot: Telegraf<Context>) {
    bot.command(ADMIN_COMMAND, command_admin)
    bot.command(SUPERADMIN_COMMAND, command_superadmin)
    bot.on("chat_member", event_onChatMember)
}