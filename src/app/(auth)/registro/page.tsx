"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction, type ActionState } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegistroPage() {
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerAction,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Escribe tu nombre y elige un PIN de 4 dígitos que solo tú recuerdes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Tu nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Alberto"
              autoComplete="off"
              required
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-[var(--color-danger)]">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">Tu PIN (4 dígitos)</Label>
            <PinInput
              id="pin"
              name="pin"
              value={pin}
              onChange={setPin}
              autoFocus={false}
            />
            {state.fieldErrors?.pin && (
              <p className="text-sm text-[var(--color-danger)] text-center">
                {state.fieldErrors.pin}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pinConfirm">Confirma tu PIN</Label>
            <PinInput
              id="pinConfirm"
              name="pinConfirm"
              value={pinConfirm}
              onChange={setPinConfirm}
            />
            {state.fieldErrors?.pinConfirm && (
              <p className="text-sm text-[var(--color-danger)] text-center">
                {state.fieldErrors.pinConfirm}
              </p>
            )}
          </div>

          {state.error && !state.fieldErrors && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={pending || pin.length < 4 || pinConfirm.length < 4}
          >
            {pending ? "Creando..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
