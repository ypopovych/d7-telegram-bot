import { Context } from "telegraf"

export function banUser(ctx: Context, userId: number, until: number): Promise<void> {
    return ctx.kickChatMember(userId, until).then()
}

export function unbanUser(ctx: Context, userId: number): Promise<void> {
    return ctx.unbanChatMember(userId, { only_if_banned: true }).then()
}