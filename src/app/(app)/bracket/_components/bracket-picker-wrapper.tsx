"use client";

import {
  BracketPicker,
  type SavePickInput,
} from "@/components/app/bracket-picker";
import type { ResolvedMatch } from "@/lib/derive-bracket";
import { saveBracketPickAction } from "../_actions";

export function BracketPickerWrapper({
  matches,
  lockedMatchIds,
}: {
  matches: ResolvedMatch[];
  lockedMatchIds?: readonly string[];
}) {
  async function save(input: SavePickInput) {
    return saveBracketPickAction(input);
  }
  return (
    <BracketPicker
      matches={matches}
      locked={false}
      saveAction={save}
      lockedRounds={["r32"]}
      lockedMatchIds={lockedMatchIds}
      description="Los 16avos se llenan solos con los ganadores de tus pronósticos (en azul). Octavos en adelante los eliges tú."
    />
  );
}
