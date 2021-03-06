import { Telegraf } from "telegraf"
import * as fs from 'fs'
import * as path from 'path'
import * as modules from "./modules"
import { TelegrafContext } from "./types"
import * as redis from './redis/async'
import { RedisStorage } from "./redis/storage"
import { AsyncTaskRunner, delay } from './utils/delay'
import { Configuration } from "./config"
import { XKCD } from "./utils/xkcd"

// Path to config file
const configPath = process.env.CONFIG_FILE ?? path.join(__dirname, "..", "config.json")

// Reading config file
const config = new Configuration(configPath)

// Creating bot instance
const bot = new Telegraf<TelegrafContext>(config.botToken)

// Add task runner
const taskRunner = new AsyncTaskRunner()

// Storage instance
const storage = new RedisStorage(redis.createClient(config.redis.url), config.redis.options)

// Reading Jokes
const jokes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "jokes.json"), {encoding: 'utf8'}))

// Creating XKCD provider
const xkcd = new XKCD()

// Bootstraping and starting modules
const moduleResolver = modules.MODULES.bootstrap({bot, storage, taskRunner, config, jokes, xkcd})
moduleResolver.init()

// WebHook setup
let options: Telegraf.LaunchOptions = {
    allowedUpdates: [
        "message", "chat_member", "my_chat_member",
        "callback_query", "edited_message"
    ]
}

if (config.webHook) {
    options.webhook = {
        domain: config.webHook.domain,
        port: config.webHook.port,
        host: config.webHook.host
    }
    if (config.webHook.pathPrefix) {
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
bot.launch(options).then(() => delay(1000)).then(() => {
    if (options.webhook && config.webHook && config.webHook.tls?.selfSigned) {
        bot.telegram.setWebhook(`${options.webhook.domain}${options.webhook.hookPath}`, {
            drop_pending_updates: options.dropPendingUpdates,
            allowed_updates: options.allowedUpdates,
            certificate: { source: options.webhook.tlsOptions!.cert as Buffer }
          })
    }
})

// Enable graceful stop
process.once('SIGINT', () => {
    taskRunner.stop()
    moduleResolver.deinit()
    bot.stop('SIGINT')
})
process.once('SIGTERM', () => {
    taskRunner.stop()
    moduleResolver.deinit()
    bot.stop('SIGTERM')
})