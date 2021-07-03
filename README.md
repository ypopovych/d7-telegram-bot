# D7 TelegramAdministrator Bot
Telegram Administrator bot for D7 chats

# How to build and run
## Install dependencies
```sh
npm install
```

## Create config
Copy `config.example.json` into `config.json` and set `botToken` value.

## Run
Start dev version without compiling with `ts-node`:
```sh
npm run dev
```

## Compile & Run
For performance reasons it's better to compile TypeScript and run JS:
```sh
npm run build && npm start
```