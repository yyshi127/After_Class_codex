export type PaginationQuery = {
  page?: string | number;
  pageSize?: string | number;
  sortBy?: string;
  sortOrder?: string;
};

export function parsePagination(query: PaginationQuery = {}) {
  const page = clampNumber(query.page, 1, 100000, 1);
  const pageSize = clampNumber(query.pageSize, 1, 200, 50);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
  } as const;
}

export function paginatedResult<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

function clampNumber(value: string | number | undefined, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
