import { Telegraf } from "telegraf"
import { Context, MatchedContext, MethodConfig } from "../types"
import { Module } from "../module"
import { enableRo } from "../utils/ro"
import { ensureChatAdmin, isMediaMessage, isBotCommand } from "../utils/validators"

export interface AutoRoModuleConfig {
    auto_ro_message_count: MethodConfig
    set_auto_ro_message_count: MethodConfig
}

export class AutoRoModule extends Module<AutoRoModuleConfig> {
    static readonly moduleName = "auto_ro"

    private readonly NUMBER_OF_MESSAGES_KEY = "number_of_messages"
    private readonly MEDIA_GROUP_ID_KEY = "media_group_id"

    private async command_setNumberOfMessages(ctx: MatchedContext<Context, 'text'>): Promise<void> {
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

    private async command_getNumberOfMessages(ctx: MatchedContext<Context, 'text'>): Promise<void> {
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

    private async event_onMessage(ctx: MatchedContext<Context, 'message'>, next: () => Promise<void>): Promise<void> {
        const count = await this.getNumberOfMessages(ctx)
        if (count > 0) {
            const { isMedia, mediaGroupId } = isMediaMessage(ctx.message)
            if (isMedia) {
                if (await this.newMediaMessage(ctx, mediaGroupId ?? '', count)) {
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

    static readonly defaultConfig: AutoRoModuleConfig = {
        auto_ro_message_count: { shortCall: false },
        set_auto_ro_message_count: { shortCall: false }
    }

    register(bot: Telegraf<Context>): void {
        bot.command("auto_ro_message_count", this.command_getNumberOfMessages.bind(this))
        bot.command("set_auto_ro_message_count", this.command_setNumberOfMessages.bind(this))
        bot.on('message', this.event_onMessage.bind(this))
    }

    title(): string { return 'АвтоРО' }
    commands(): Record<string, string> {
        return {
            'auto_ro_message_count': 'переглянути кількість медія для АвтоРО',
            'set_auto_ro_message_count': 'встановити кількість медіа для АвтоРО',
        }
    }

    // Helpers
    private getNumberOfMessages(ctx: MatchedContext<Context, 'message'>): Promise<number> {
        return this.getConfigValue(ctx.chat.id, this.NUMBER_OF_MESSAGES_KEY)
    }
    
    private setNumberOfMessages(ctx: MatchedContext<Context, 'message'>, number: number): Promise<void> {
        return this.setConfigValue(ctx.chat.id, this.NUMBER_OF_MESSAGES_KEY, number)
    }

    private async newMediaMessage(
        ctx: MatchedContext<Context, 'message'>, mediaGroupId: string, count: number
    ): Promise<boolean> {
        const groupId = await this.storage
            .getValues(String(ctx.chat.id), this.moduleName(), [this.MEDIA_GROUP_ID_KEY])
            .then(groups => groups[0] ?? '')
        if (groupId == mediaGroupId && mediaGroupId != '') {
            return false
        }
        await this.storage.setValues(
            String(ctx.chat.id), this.moduleName(),
            { [this.MEDIA_GROUP_ID_KEY]: mediaGroupId }, 86400
        )
        const current = await this.storage.incValue(
            String(ctx.chat.id), this.moduleName(), this.NUMBER_OF_MESSAGES_KEY, 1
        )
        return !ctx.message.from.is_bot && current >= count
    }

    private newNonMediaMessage(ctx: MatchedContext<Context, 'message'>): Promise<void> {
        return this.storage.removeValues(
            String(ctx.chat.id), this.moduleName(),
            [this.NUMBER_OF_MESSAGES_KEY, this.MEDIA_GROUP_ID_KEY]
        )
    }
}
