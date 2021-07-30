import { Telegraf } from "telegraf"
import { TelegrafContext, MatchedContext, MethodConfig } from "../types"
import { Module, ModuleContext, NullModule } from "../module"
import { enableRo } from "../utils/ro"
import { ensureChatAdmin, isMediaMessage, isBotCommand } from "../utils/validators"

export type Config = {
    auto_ro_message_count: MethodConfig
    set_auto_ro_message_count: MethodConfig
}

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export class AutoRoModule extends Module<NullModule, Context, Config> {
    readonly name = "auto_ro"
    static readonly moduleName = "auto_ro"

    private readonly NUMBER_OF_MESSAGES_KEY = "number_of_messages"
    private readonly MEDIA_GROUP_ID_KEY = "media_group_id"

    private async command_setNumberOfMessages(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.set_auto_ro_message_count)) return
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
    
        await this.setNumberOfMessages(ctx, number)
    
        const response: string = number == 0
            ? "АвтоРО вимкнено!"
            : `АвтоРО увімкнено й для нього треба ${number} медіа-повідомлень підряд`
    
        await ctx.reply(
            response,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_getNumberOfMessages(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.auto_ro_message_count)) return
    
        const number = await this.getNumberOfMessages(ctx)
    
        const response: string = number == 0
            ? "АвтоРО вимкнено!"
            : `АвтоРО увімкнено й для нього треба ${number} медіа-повідомлень підряд`
    
        await ctx.reply(
            response,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async event_onMessage(ctx: MatchedContext<TelegrafContext, 'message'>, next: () => Promise<void>): Promise<void> {
        const count = await this.getNumberOfMessages(ctx)
        if (count > 0) {
            const { isMedia, mediaGroupId } = isMediaMessage(ctx.message)
            if (isMedia) {
                if (await this.newMediaMessage(ctx, mediaGroupId || '', count)) {
                    await enableRo(
                        ctx.telegram, this.storage, String(ctx.chat.id),
                        ctx.message.from.id, 86400,
                        ctx.message.message_id, ctx.message.from.first_name,
                        `за ${count} або більше медіа підряд`
                    )
                }
            } else {
                await this.newNonMediaMessage(ctx)
            }
        }
        await next()
    }

    static readonly defaultConfig: Config = {
        auto_ro_message_count: { shortCall: false },
        set_auto_ro_message_count: { shortCall: false }
    }

    init(): void {
        this.context.bot.command("auto_ro_message_count", this.command_getNumberOfMessages.bind(this))
        this.context.bot.command("set_auto_ro_message_count", this.command_setNumberOfMessages.bind(this))
        this.context.bot.on('message', this.event_onMessage.bind(this))
    }

    deinit(): void {
        
    }

    title(): string { return 'АвтоРО' }
    commands(): Record<string, string> {
        return {
            'auto_ro_message_count': 'переглянути кількість медія для АвтоРО',
            'set_auto_ro_message_count': 'встановити кількість медіа для АвтоРО',
        }
    }

    // Helpers
    private getNumberOfMessages(ctx: MatchedContext<TelegrafContext, 'message'>): Promise<number> {
        return this.getConfigValue(ctx.chat.id, this.NUMBER_OF_MESSAGES_KEY)
    }
    
    private setNumberOfMessages(ctx: MatchedContext<TelegrafContext, 'message'>, number: number): Promise<void> {
        return this.setConfigValue(ctx.chat.id, this.NUMBER_OF_MESSAGES_KEY, number)
    }

    private async newMediaMessage(
        ctx: MatchedContext<TelegrafContext, 'message'>, mediaGroupId: string, count: number
    ): Promise<boolean> {
        const groupId = await this.storage
            .updateValues(
                String(ctx.chat.id), this.name,
                {[this.MEDIA_GROUP_ID_KEY]: mediaGroupId}
            )
            .then(groups => groups[this.MEDIA_GROUP_ID_KEY] ?? '')
        if (groupId == mediaGroupId && mediaGroupId != '') {
            return false
        }
        const current = await this.storage.incValue(
            String(ctx.chat.id), this.name, this.NUMBER_OF_MESSAGES_KEY, 1
        )
        return !ctx.message.from.is_bot && current >= count
    }

    private newNonMediaMessage(ctx: MatchedContext<TelegrafContext, 'message'>): Promise<void> {
        return this.storage.removeValues(
            String(ctx.chat.id), this.name,
            [this.NUMBER_OF_MESSAGES_KEY, this.MEDIA_GROUP_ID_KEY]
        )
    }
}
