"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "../_actions";
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

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Ingresa tu nombre y tu PIN de 4 dígitos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Alberto"
              autoComplete="username"
              required
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-[var(--color-danger)]">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
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

          {state.error && !state.fieldErrors && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {state.error}
            </p>
          )}

          <Button type="submit" fullWidth disabled={pending || pin.length < 4}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          ¿Primera vez?{" "}
          <Link
            href="/registro"
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Crea tu PIN
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
