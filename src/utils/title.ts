import { Context } from "../types"

const MODULE = "title"
const TITLES_KEY = "titles"

export async function setTitle(ctx: Context, userId: number, title: string): Promise<void> {
    await ctx.promoteChatMember(userId, { can_invite_users: true })
    await ctx.setChatAdministratorCustomTitle(userId, title)
    let titles: Record<number, string> = await ctx.storage.getConfigValue(String(ctx.chat!.id), MODULE, TITLES_KEY) ?? {}
    titles[userId] = title
    await ctx.storage.setConfigValue(String(ctx.chat!.id), MODULE, TITLES_KEY, titles)
}

export async function restoreTitle(ctx: Context, userId: number): Promise<void> {
    let titles: Record<number, string> = await ctx.storage.getConfigValue(String(ctx.chat!.id), MODULE, TITLES_KEY) ?? {}
    const title = titles[userId]
    if (title) {
        await ctx.promoteChatMember(userId, { can_invite_users: true })
        await ctx.setChatAdministratorCustomTitle(userId, title)
    }
}