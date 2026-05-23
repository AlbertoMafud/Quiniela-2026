"use client";

import {
  BracketPicker as SharedBracketPicker,
  type SavePickInput,
} from "@/components/app/bracket-picker";
import type { ResolvedMatch } from "@/lib/derive-bracket";
import { saveEarlyPickAction } from "../_actions";

interface Props {
  matches: ResolvedMatch[];
  locked: boolean;
  lockReason?: string;
}

export function BracketPicker(props: Props) {
  async function save(input: SavePickInput) {
    return saveEarlyPickAction(input);
  }
  return <SharedBracketPicker {...props} saveAction={save} />;
}
