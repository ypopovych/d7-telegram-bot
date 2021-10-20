export function fixChatId(id: number | string): number {
    const sId = typeof id === "string" ? id : id.toString(10);
    if (sId[0] === "-") {
        if (sId.slice(0, 4) === "-100") {
            return parseInt(sId.slice(4), 10);
        } else {
            return parseInt(sId.slice(1), 10);
        }
    }
    return parseInt(sId, 10);
}