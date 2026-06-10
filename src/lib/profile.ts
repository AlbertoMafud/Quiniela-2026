import { z } from "zod";

// Reglas de nombre compartidas (mismas que el registro): trim, 3–30 chars.
export const nameSchema = z
  .string()
  .trim()
  .min(3, "El nombre debe tener al menos 3 caracteres.")
  .max(30, "El nombre no puede tener más de 30 caracteres.");

// Compara dos nombres ignorando mayúsculas y espacios al borde.
// Base de la unicidad case-insensitive: "Pedro" choca con "pedro".
export function namesEqualCI(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}
