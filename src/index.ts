import { Telegraf } from "telegraf"
import * as fs from 'fs'
import * as path from 'path'
import * as modules from "./modules"
import { Context } from "./types"
import * as redis from './redis/async'
import { RedisStorage } from "./redis/storage"
import { AsyncTaskRunner } from './utils/delay'

// Reading config file
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config.json"), { encoding: "utf8" }))

// Creating bot instance
const bot = new Telegraf<Context>(config.botToken)

// Add task runner
const taskRunner = new AsyncTaskRunner()

// Storage instance
const storage = new RedisStorage(redis.createClient(config.redis.url), config.redis.options)

// Registering bot modules
modules.registerModulesIn(bot, storage, taskRunner, config.modules ?? {})

// WebHook setup
let options: Telegraf.LaunchOptions = {
    allowedUpdates: [
        "message", "poll", "chat_member", "my_chat_member",
        "poll_answer", "edited_message"
    ]
}
if (config.webHook && config.webHook.domain) {
    options.webhook = {
        domain: config.webHook.domain,
        port: config.webHook.port ?? 443,
        host: config.webHook.host ?? "0.0.0.0"
    }
    if (config.webHook.pathPrefix && config.webHook.pathPrefix != "") {
        options.webhook.hookPath = config.webHook.pathPrefix + "/" + bot.secretPathComponent()
    }
    if (config.webHook.tls) {
        const keyPath = path.isAbsolute(config.webHook.tls.key)
            ? config.webHook.tls.key
            : path.join(__dirname, "..", config.webHook.tls.key)
        const certPath = path.isAbsolute(config.webHook.tls.cert)
            ? config.webHook.tls.cert
            : path.join(__dirname, "..", config.webHook.tls.cert)
        options.webhook.tlsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        }
        if (config.webHook.tls.ca) {
            const ca: string[] = typeof config.webHook.tls.ca === "string"
                ? [config.webHook.tls.ca]
                : config.webHook.tls.ca

            const buffers = ca.map(pth => {
                const caPath = path.isAbsolute(pth)
                    ? pth
                    : path.join(__dirname, "..", pth)
                return fs.readFileSync(caPath)
            })
            options.webhook.tlsOptions.ca = buffers
        }
    }
}

// Starting task runner
taskRunner.start()

// Launching bot
bot.launch(options)

// Enable graceful stop
process.once('SIGINT', () => {
    taskRunner.stop()
    bot.stop('SIGINT')
})
process.once('SIGTERM', () => {
    taskRunner.stop()
    bot.stop('SIGTERM')
})