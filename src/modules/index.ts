import { Telegraf } from "telegraf"
import { Context } from "../types"
import { register as ro_voting } from "./ro_voting"
import { register as nuke } from "./nuke"

export function register(bot: Telegraf<Context>) {
    ro_voting(bot)
    nuke(bot)
}