import * as https from 'https'

export type XKCDItem = {
    day: string
    month: string
    year: string
    num: number
    link: string
    news: string
    title: string
    safe_title: string
    transcript: string
    alt: string
    img: string
}

export class XKCD {
    baseUrl: string

    constructor(url?: string) {
        this.baseUrl = url ?? 'https://xkcd.com'
    }

    private request(id?: number): Promise<XKCDItem> {
        const url = id
            ? `${this.baseUrl}/${id}/info.0.json`
            : `${this.baseUrl}/info.0.json`
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (!res.statusCode || res.statusCode < 200 || res.statusCode > 300) {
                    reject(new Error("Bad status code " + res.statusCode))
                    return
                }
                let data = ''
                res.on('data', (chunk) => data += chunk)
                res.on('error', (err) => reject(err))
                res.on('end', () => resolve(JSON.parse(data)))
            })
            .on('error', (err) => reject(err))
        })
    }

    withId(id: number): Promise<XKCDItem> {
        return this.request(id)
    }

    latest(): Promise<XKCDItem> {
        return this.request()
    }

    random(): Promise<XKCDItem> {
        return this.latest().then((item) => this.withId(this.getRandomIntInclusive(1, item.num)))
    }

    private getRandomIntInclusive(min: number, max: number) {
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(Math.random() * (max - min + 1)) + min
    }
}