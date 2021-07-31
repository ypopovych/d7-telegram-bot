import { User } from 'typegram'

export function getHoursString(seconds: number): string {
    const hours = seconds / 3600
    if (hours % 10 == 1 && (hours % 100 < 10 || hours % 100 > 20)) {
        return `${hours} годину`
    }
    if (hours % 10 < 5 && (hours % 100 < 10 || hours % 100 > 20)) {
        return `${hours} години`
    }
    return `${hours} годин`
}

export function getMinutesString(seconds: number): string {
    const minutes = seconds / 60
    if (minutes % 10 == 1 && (minutes % 100 < 10 || minutes % 100 > 20)) {
        return `${minutes} хвилину`
    }
    if (minutes % 10 < 5 && (minutes % 100 < 10 || minutes % 100 > 20)) {
        return `${minutes} хвилини`
    }
    return `${minutes} хвилин`
}

export function getSecondsString(seconds: number): string {
    if (seconds % 10 == 1 && (seconds % 100 < 10 || seconds % 100 > 20)) {
        return `${seconds} секунду`
    }
    if (seconds % 10 < 5 && (seconds % 100 < 10 || seconds % 100 > 20)) {
        return `${seconds} секунди`
    }
    return `${seconds} секунд`
}

export function getUserNameString(user: User): string {
    return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name
}