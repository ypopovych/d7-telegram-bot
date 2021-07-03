import { Telegraf } from "telegraf"
import { Context, MatchedContext, MethodConfig } from "../types"
import { Module } from "../module"
import { isBotCommand } from "../utils/validators"

type NCityInfo = { id: string, bText: string, lText: string, lat: string, lng: string}

export interface NukeModuleConfig {
    nuke_list: MethodConfig
    'nuke*': MethodConfig
}

export class NukeModule extends Module<NukeModuleConfig> {
    static readonly moduleName = "nuke"

    readonly NUKE_LIST: NCityInfo[] = [
        { id: "moscow", bText: "до Мацкви", lText: "хуйнуть Мацкву", lat: '55.7542102', lng: '37.620095'},
        { id: "rivne", bText: "у Рівне", lText: "зачинити Рiвненський осередок", lat: '50.619900', lng: '26.251617'},
        { id: "cherkasy", bText: "до Черкас", lText: "Черкасси - файне мiсто", lat: '49.444431', lng: '32.059769'},
        { id: "lviv", bText: "до Львова", lText: "бахнути по Львову", lat: '49.841142', lng: '24.028884' },
        { id: "kharkiv", bText: "по Харкову", lText: "бахнути по Харкову", lat: '50.004589', lng: '36.235646'},
        { id: "mariupol", bText: "по Маріуполю", lText: "бахнути по Маріуполю", lat: '47.112200', lng: '37.558564'},
        { id: "kyiv", bText: "по Києву", lText: "бахнути по Київу", lat: '50.452682', lng: '30.539047'},
        { id: "boryspil", bText: "по Борисполю", lText: "бахнути по Бориспілю", lat: '50.347929', lng: '30.956096'},
        { id: "rostov", bText: "по Ростову", lText: "хуйнуть Ростов", lat: '47.233517', lng: '39.702932'},
        { id: "donetsk", bText: "по Донецьку", lText: "бахнути по Донецьку", lat: '48.017622', lng: '37.789059'},
        { id: "krasnodar", bText: "по Краснодару", lText: "хуйнуть Краснодар", lat: '45.037473', lng: '38.975125'},
        { id: "st_peterburg", bText: "по Санкт-Пєтєрбургу", lText: "хуйнуть Санкт-Петербург", lat: '59.935923', lng: '38.975125'},
        { id: "voroneg", bText: "по Воронєжу", lText: "хуйнуть Воронiж", lat: '51.667481', lng: '39.208400'},
        { id: "mykolayiv", bText: "по Миколаєву", lText: "бахнути по Миколаїву", lat: '46.967241', lng: '32.032497'},
        { id: "misery", bText: "по острову Misery в США", lText: "бахнути по острову Misery в США", lat: '42.548135', lng: '-70.798274'}
    ]

    readonly NUKE_COMMON_PARAMS = "casualties=1&fallout=1&ff=52&psi=20,5,1&zm=9"
    readonly NUKE_REGEX = new RegExp(/\/nuke_([a-zA-Z0-9_\-\.]+)/)

    private async command_nukeList(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.nuke_list)) return
    
        const botPart = ctx.chat.type == 'private' ? '' : '@' + ctx.botInfo.username
    
        const lines = this.NUKE_LIST.reduce((lines, nuke) => {
            return lines.concat([`    /nuke_${nuke.id}${botPart} - ${nuke.lText}`])
        }, ["<b>Бамбiть с вертольота:</b>"])
    
        await ctx.replyWithHTML(lines.join('\n'), {reply_to_message_id: ctx.message.message_id})
    }

    private async event_onMessage(ctx: MatchedContext<Context, 'text'>, next: () => Promise<void>): Promise<void> {
        if (!isBotCommand(ctx, this.config["nuke*"])) return next()
        const match = this.NUKE_REGEX.exec(ctx.message.text)
        if (!match) return await next()
        const id = match[1]
        const city = this.NUKE_LIST.find(c => c.id == id)
        if (!city) return
        let airbust = "airburst=0&hob_ft=0", text = "(долетіло до Землі)", bomb = this.getBombSize()
        if (this.getRandomIntInclusive(0, 1) == 1) {
            airbust = "hob_psi=5&hob_ft=47553"; text = "(йобнуло у повітрі)"
        }
        const reply = 'Знайшла у шухлядi бiмбу у '
            + bomb + ` кiлотонн, хуйнула ${city.bText}, і <a href = "https://nuclearsecrecy.com/nukemap/?&kt=`
            + bomb + `&lat=${city.lat}&lng=${city.lng}&${airbust}` 
            + '&' + this.NUKE_COMMON_PARAMS
            + '">ось</a> шо вийшло ' + text
        await ctx.replyWithHTML(reply, {reply_to_message_id: ctx.message.message_id})
    }

    static readonly defaultConfig: NukeModuleConfig = {
        nuke_list: { shortCall: false },
        'nuke*': { shortCall: false }
    }

    register(bot: Telegraf<Context>): void {
        bot.command("nuke_list", this.command_nukeList.bind(this))
        bot.on('text', this.event_onMessage.bind(this))
    }

    title(): string { return 'Бомбимо' }
    commands(): Record<string, string> {
        return this.NUKE_LIST.reduce((list, city) => {
            list[`nuke_${city.id}`] = city.lText
            return list
        }, {'nuke_list': 'Отримати список міст для бомбардування'} as Record<string, string>)
    }

    // Helpers
    private getBombSize() {
        const sizes = [
            10, 20, 50, 100, 150, 280, 350,
            600, 800, 1000, 2000, 5000, 8000,
            100000
        ]
        let bomb_size = this.getRandomIntInclusive(0, sizes.length-1)
        bomb_size = Math.round(this.getRandomIntInclusive(sizes[bomb_size]-sizes[bomb_size]*0.02, sizes[bomb_size]+sizes[bomb_size]*0.02))
        return Math.min(bomb_size, 100000)
    }
    
    private getRandomIntInclusive(min: number, max: number) {
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(Math.random() * (max - min + 1)) + min //Включаючи мінімум та максимум
    }
}
