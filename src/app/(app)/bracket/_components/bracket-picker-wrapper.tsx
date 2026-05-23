"use client";

import {
  BracketPicker,
  type SavePickInput,
} from "@/components/app/bracket-picker";
import type { ResolvedMatch } from "@/lib/derive-bracket";
import { saveBracketPickAction } from "../_actions";

export function BracketPickerWrapper({
  matches,
}: {
  matches: ResolvedMatch[];
}) {
  async function save(input: SavePickInput) {
    return saveBracketPickAction(input);
  }
  return <BracketPicker matches={matches} locked={false} saveAction={save} />;
}
