export const trim = (text: string, maxLen: number) => {
    if (text.length > maxLen) {
        return text.substr(0, maxLen) + '...'
    }
    return text;
}