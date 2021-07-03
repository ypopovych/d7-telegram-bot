export function getHoursString(seconds: number): string {
    const hours = seconds / 3600
    if (hours % 10 == 1 && hours % 100 > 20) {
        return `${hours} годину`
    }
    if (hours % 10 < 5 && hours % 100 > 20) {
        return `${hours} години`
    }
    return `${hours} годин`
}