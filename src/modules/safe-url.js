export function safeHTTPURL(value, baseURL) {
    let parsed;
    try {
        parsed = new URL(value, baseURL);
    } catch {
        return null;
    }
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
}

export function openExternalHTTPURL(
    value,
    baseURL = window.location.href,
    openWindow = window.open
) {
    const safe = safeHTTPURL(value, baseURL);
    if (!safe) return false;
    openWindow(safe, '_blank', 'noopener,noreferrer');
    return true;
}
