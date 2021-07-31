import { Telegraf } from "telegraf"
import { TelegrafContext, MatchedContext, MethodConfig } from "../types"
import { Module, ModuleContext, NullModule } from "../module"
import { XKCD, XKCDItem } from "../utils/xkcd"
import { isBotCommand, ensureChatAdmin } from "../utils/validators"
import { getSecondsString } from '../utils/string'

export type Config = {
    xkcd: MethodConfig
    xkcd_cooldown: MethodConfig
    xkcd_set_cooldown: MethodConfig
}

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
    xkcd: XKCD
}

export class XkcdModule extends Module<NullModule, Context, Config> {
    readonly name = "xkcd"
    static readonly moduleName = "xkcd"
    private xkcd!: XKCD

    readonly COOLDOWN_KEY = "cooldown_seconds"
    readonly LAST_MESSAGE_DATE_KEY = "last_message_date"

    private async command_xkcd(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.xkcd)) return
        if (!await this.ensureCooldown(ctx.chat.id)) return
  
        const index = ctx.message.text.indexOf(' ')

        let req: Promise<XKCDItem>
        if (index > 0) {
            const substr = ctx.message.text.substring(index)
            const number = parseInt(substr, 10)
            
            if (isNaN(number) || number < 1) { return }
            req = this.xkcd.withId(number)
        } else {
            req = this.xkcd.random()
        }

        try {
            const item = await req
            const explained_link = `https://www.explainxkcd.com/wiki/index.php/${item.num}`
            await ctx.replyWithPhoto(item.img, {
                reply_to_message_id: ctx.message.message_id,
                caption: `[XKCD \\#${item.num}](${explained_link})`,
                parse_mode: "MarkdownV2"
            })
            await this.updateCooldown(ctx.chat.id)
        } catch {}
    }

    private async command_setCooldown(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.xkcd_set_cooldown)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.message.from)) return
    
        const index = ctx.message.text.indexOf(ctx.botInfo.username) + ctx.botInfo.username.length
        const substr = ctx.message.text.substring(index)
        const number = parseInt(substr, 10)
        
        if (isNaN(number) || number < 0) {
            await ctx.reply(
                'Щось неправильно введено, спробуй ще раз, на цей раз цифрами',
                { reply_to_message_id: ctx.message.message_id }
            )
            return
        }
    
        await this.setCooldown(ctx.chat.id, number)
    
        await ctx.reply(
            `Затримка між командами xkcd тепер складає ${getSecondsString(number)}`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_getCooldown(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.xkcd_cooldown)) return
    
        const number = await this.getCooldown(ctx.chat.id)
    
        await ctx.reply(
            `Затримка між командами xkcd складає ${getSecondsString(number)}`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    static readonly defaultConfig: Config = {
        xkcd: { shortCall: false },
        xkcd_cooldown: { shortCall: false },
        xkcd_set_cooldown: { shortCall: false }
    }

    init(): void {
        this.xkcd = this.context.xkcd
        this.context.bot.command("xkcd", this.command_xkcd.bind(this))
        this.context.bot.command("xkcd_cooldown", this.command_getCooldown.bind(this))
        this.context.bot.command("xkcd_set_cooldown", this.command_setCooldown.bind(this))
    }

    deinit(): void {}

    title(): string { return 'XKCD' }
    commands(): Record<string, string> {
        return {
            xkcd: 'вивести комікс з xkcd.com',
            xkcd_cooldown: 'вивести затримку команди xkcd',
            xkcd_set_cooldown: 'встановити затримку команди xkcd'
        }
    }

    private getCooldown(chatId: number): Promise<number> {
        return this.getConfigValue(chatId, this.COOLDOWN_KEY)
    }

    private setCooldown(chatId: number, seconds: number): Promise<void> {
        return this.setConfigValue(chatId, this.COOLDOWN_KEY, seconds)
    }

    private async ensureCooldown(chatId: number): Promise<boolean> {
        const cooldown = await this.getCooldown(chatId)
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
