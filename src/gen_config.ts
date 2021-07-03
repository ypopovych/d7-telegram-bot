import { generateDefaultConfig } from "./modules"

const defaultConfig = {
    botToken: "",
    redis: {
        url: "redis://127.0.0.1:6379",
        options: {
            "keyPrefix": "d7bot"
        }
    },
    modules: generateDefaultConfig(),
    webHook: {
        domain: null,
        host: "0.0.0.0",
        port: 443,
        pathPrefix: "/telegram",
        tls: null
    }
}

console.log(JSON.stringify(defaultConfig, null, 2))