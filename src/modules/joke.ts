import { Telegraf } from "telegraf"
import * as fs from "fs"
import * as path from "path"
import { TelegrafContext, MatchedContext, MethodConfig } from "../types"
import { Module, ModuleContext, NullModule } from "../module"
import { isBotCommand, ensureChatAdmin } from "../utils/validators"
import { getRandomIntInclusive } from "../utils/random"
import { Resolver } from "../bootstrapper"

type Joke = { month: number; month_text: string, year: number; release: string, joke: string }

export type Config = {
    tell_joke: MethodConfig
    tell_joke_cooldown: MethodConfig
    tell_joke_set_cooldown: MethodConfig
}

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export class JokeModule extends Module<NullModule, Context, Config> {
    readonly name = "joke"
    static readonly moduleName = "joke"
    private jokes: Joke[] 

    readonly COOLDOWN_KEY = "cooldown_seconds"
    readonly LAST_MESSAGE_DATE_KEY = "last_message_date"

    constructor(resolver: Resolver<NullModule>, context: Context) {
        super(resolver, context)
        this.jokes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "jokes.json"), {encoding: 'utf8'}))
    }

    private async command_tellJoke(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.tell_joke)) return
        if (!await this.ensureCooldown(ctx.chat.id)) return

        const joke = this.jokes[getRandomIntInclusive(1, this.jokes.length) - 1]

        const text = `${joke.joke}\n———\n${joke.release} ♦ ${joke.month_text} ${joke.year}`

        await ctx.reply(text, { reply_to_message_id: ctx.message.message_id })
        await this.updateCooldown(ctx.chat.id)
    }

    private async command_setCooldown(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.tell_joke_set_cooldown)) return
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
            `Затримка між командами tell_joke тепер складає ${number} секунд`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_getCooldown(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.tell_joke_cooldown)) return
    
        const number = await this.getCooldown(ctx.chat.id)
    
        await ctx.reply(
            `Затримка між командами tell_joke складає ${number} секунд`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    static readonly defaultConfig: Config = {
        tell_joke: { shortCall: false },
        tell_joke_cooldown: { shortCall: false },
        tell_joke_set_cooldown: { shortCall: false }
    }

    init(): void {
        this.context.bot.command("tell_joke", this.command_tellJoke.bind(this))
        this.context.bot.command("tell_joke_cooldown", this.command_getCooldown.bind(this))
        this.context.bot.command("tell_joke_set_cooldown", this.command_setCooldown.bind(this))
    }

    title(): string { return 'Юморески' }
    commands(): Record<string, string> {
        return {
            tell_joke: 'розповісти анекдот з Правдоруба',
            tell_joke_cooldown: 'вивести затримку команди tell_joke',
            tell_joke_set_cooldown: 'встановити затримку команди tell_joke'
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
