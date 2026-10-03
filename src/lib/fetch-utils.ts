/**
 * Safely parse JSON from a fetch response
 * Handles non-JSON responses gracefully to prevent JSON parse errors
 */
export async function safeJsonParse(response: Response) {
    const contentType = response.headers.get('content-type');

    // Check if response is JSON
    if (contentType && contentType.includes('application/json')) {
        try {
            return await response.json();
        } catch (error) {
            console.error('JSON parse error:', error);
            throw new Error('Invalid JSON response');
        }
    }

    // If not JSON, try to get text
    const text = await response.text();

    // If empty, return null
    if (!text || text.trim() === '') {
        console.warn('Empty response body');
        return null;
    }

    // Try to parse as JSON anyway (some APIs don't set content-type correctly)
    try {
        return JSON.parse(text);
    } catch {
        // Not JSON, return as text
        console.warn('Response is not JSON, returning as text');
        return { error: text };
    }
}

/**
 * Check if a fetch response is successful and has JSON content
 */
export function isJsonResponse(response: Response): boolean {
    const contentType = response.headers.get('content-type');
    return contentType !== null && contentType.includes('application/json');
}

/**
 * Fetch wrapper with automatic error handling and JSON parsing
 */
export async function fetchJson<T = any>(
    url: string,
    options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
    try {
        const response = await fetch(url, options);

        // Check if response is OK
        if (!response.ok) {
            const errorData = await safeJsonParse(response);
            return {
                data: null,
                error: errorData?.message || errorData?.error || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        // Parse successful response
        const data = await safeJsonParse(response);
        return { data, error: null };

    } catch (error) {
        console.error('Fetch error:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Network error occurred'
        };
    }
}

/**
 * Example usage:
 * 
 * const { data, error } = await fetchJson('/api/users');
 * if (error) {
 *   console.error('Error:', error);
 *   return;
 * }
 * // Use data safely
 */
