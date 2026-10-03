/**
 * Formats data with pagination metadata
 * @param data Array of paginated items
 * @param page Current page number (1-based)
 * @param limit Number of items per page
 * @param total Total number of items available
 * @returns Formatted response with data and pagination info
 */
export function formatPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    }
  };
}
