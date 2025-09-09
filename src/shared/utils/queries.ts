export function appendQueries<T extends PostgrestQueryBuilder<T>>(
  query: T,
  filters: Record<string, unknown>,
): T {
  Object.entries(filters).forEach(([field, value]) => {
    query = appendQuery(query, field, value);
  });
  return query;
}

export function appendQuery<T extends PostgrestQueryBuilder<T>>(
  query: T,
  field: string,
  value: unknown,
  dbFieldName?: string,
): T {
  if (value) {
    return Array.isArray(value)
      ? query.in(dbFieldName || field, value)
      : query.eq(dbFieldName || field, value);
  } else {
    return query;
  }
}

interface PostgrestQueryBuilder<T> {
  in(column: string, values: unknown[]): T;
  eq(column: string, value: unknown): T;
}
