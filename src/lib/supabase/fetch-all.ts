import "server-only";

type RangeResult<T> = { data: T[] | null; error: { message: string } | null };
type RangeQuery<T> = (from: number, to: number) => PromiseLike<RangeResult<T>>;

/**
 * Trae TODAS las filas de una consulta, paginando con .range() para evitar el
 * tope default de 1000 filas de PostgREST/Supabase.
 *
 * El `makeQuery` DEBE incluir un `.order(...)` por una columna estable (p. ej.
 * `.order("id")`), o la paginación podría saltar o duplicar filas.
 *
 * Uso:
 *   const rows = await fetchAllRows<PredRow>((from, to) =>
 *     supabase.from("predictions").select("player_id, match_id").order("id").range(from, to),
 *   );
 */
export async function fetchAllRows<T>(
  makeQuery: RangeQuery<T>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
