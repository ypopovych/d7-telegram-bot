import { Telegraf } from "telegraf"
import { Context, MatchedContext } from "../types"
import { isBotCommand } from "../utils/validators"

type NCityInfo = { id: string, bText: string, lText: string, lat: string, lng: string}

const NUKE_LIST: NCityInfo[] = [
    { id: "moscow", bText: "до Мацкви", lText: "хуйнуть Мацкву", lat: '55.7542102', lng: '37.620095'},
    { id: "rivne", bText: "у Рівне", lText: "зачинити Рiвненський осередок", lat: '50.619900', lng: '26.251617'},
    { id: "cherkasy", bText: "до Черкас", lText: "Черкасси - файне мiсто", lat: '49.444431', lng: '32.059769'}
]

const NUKE_LIST_COMMAND = "nuke_list"
const NUKE_COMMON_PARAMS = "casualties=1&fallout=1&ff=52&psi=20,5,1&zm=9"
const NUKE_REGEX = new RegExp(/\/nuke_([a-zA-Z0-9_\-\.]+)/)

function getBombSize() {
    const sizes = [
        10, 20, 50, 100, 150, 280, 350,
        600, 800, 1000, 2000, 5000, 8000,
        100000
    ]
    let bomb_size = getRandomIntInclusive(0, sizes.length-1)
    bomb_size = Math.round(getRandomIntInclusive(sizes[bomb_size]-sizes[bomb_size]*0.02, sizes[bomb_size]+sizes[bomb_size]*0.02))
    return Math.min(bomb_size, 100000)
  }

  function getRandomIntInclusive(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min //Включаючи мінімум та максимум
  }

async function command_nukeList(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return

    const botPart = ctx.chat.type == 'private' ? '' : '@' + ctx.botInfo.username

    const lines = NUKE_LIST.reduce((lines, nuke) => {
        return lines.concat([`    /nuke_${nuke.id}${botPart} - ${nuke.lText}`])
    }, ["<b>Бамбiть с вертольота:</b>"])

    await ctx.replyWithHTML(lines.join('\n'), {reply_to_message_id: ctx.message.message_id})
}

async function event_onMessage(ctx: MatchedContext<Context, 'text'>, next: () => Promise<void>): Promise<void> {
    if (!isBotCommand(ctx)) return next()
    const match = NUKE_REGEX.exec(ctx.message.text)
    if (!match) return await next()
    const id = match[1]
    const city = NUKE_LIST.find(c => c.id == id)
    if (!city) return
    let airbust = "airburst=0&hob_ft=0", text = "(долетіло до Землі)", bomb = getBombSize()
    if (getRandomIntInclusive(0, 1) == 1) {
        airbust = "hob_psi=5&hob_ft=47553"; text = "(йобнуло у повітрі)"
    }
    const reply = 'Знайшла у шухлядi бiмбу у '
        + bomb + ` кiлотонн, хуйнула ${city.bText}, і <a href = "https://nuclearsecrecy.com/nukemap/?&kt=`
        + bomb + `&lat=${city.lat}&lng=${city.lng}&${airbust}` 
        + '&' + NUKE_COMMON_PARAMS
        + '">ось</a> шо вийшло ' + text
    await ctx.replyWithHTML(reply, {reply_to_message_id: ctx.message.message_id})
}

export function register(bot: Telegraf<Context>) {
    bot.command(NUKE_LIST_COMMAND, command_nukeList)
    bot.on('text', event_onMessage)
}