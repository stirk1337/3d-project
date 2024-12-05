export const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(toCamelCase);
    } else if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            acc[camelCaseKey] = toCamelCase(value);
            return acc;
        }, {} as Record<string, any>);
    }
    return obj;
};