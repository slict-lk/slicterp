/**
 * Safe Array Utilities
 * 
 * Helper functions to safely work with arrays that might be null/undefined
 * Prevents "is not a function" errors when calling array methods
 */

/**
 * Ensures value is an array, returns empty array if not
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : [];
}

/**
 * Safely filter an array
 */
export function safeFilter<T>(
    array: T[] | null | undefined,
    predicate: (item: T, index: number, array: T[]) => boolean
): T[] {
    return ensureArray(array).filter(predicate);
}

/**
 * Safely map an array
 */
export function safeMap<T, U>(
    array: T[] | null | undefined,
    mapper: (item: T, index: number, array: T[]) => U
): U[] {
    return ensureArray(array).map(mapper);
}

/**
 * Safely reduce an array
 */
export function safeReduce<T, U>(
    array: T[] | null | undefined,
    reducer: (accumulator: U, item: T, index: number, array: T[]) => U,
    initialValue: U
): U {
    return ensureArray(array).reduce(reducer, initialValue);
}

/**
 * Safely get array length
 */
export function safeLength(array: any[] | null | undefined): number {
    return ensureArray(array).length;
}

/**
 * Safely slice an array
 */
export function safeSlice<T>(
    array: T[] | null | undefined,
    start?: number,
    end?: number
): T[] {
    return ensureArray(array).slice(start, end);
}

/**
 * Safely find in array
 */
export function safeFind<T>(
    array: T[] | null | undefined,
    predicate: (item: T, index: number, array: T[]) => boolean
): T | undefined {
    return ensureArray(array).find(predicate);
}

/**
 * Safely sort array (returns new array, doesn't mutate)
 */
export function safeSort<T>(
    array: T[] | null | undefined,
    compareFn?: (a: T, b: T) => number
): T[] {
    return [...ensureArray(array)].sort(compareFn);
}
