/**
 * Centralized logger with timestamps for backend services.
 */
export function log(category: string, message: string, level: 'info' | 'debug' | 'warn' | 'error' = 'info') {
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const logMsg = `[${time}] [${category}] ${message}`;

    switch (level) {
        case 'info':
            console.log(logMsg);
            break;
        case 'debug':
            if (process.env.DEBUG === 'true' || process.env.DEBUG_VYOS === 'true') {
                console.log(logMsg);
            }
            break;
        case 'warn':
            console.warn(logMsg);
            break;
        case 'error':
            console.error(logMsg);
            break;
    }
}
