"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loginAction, registerAction, type ActionState } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { cn } from "@/lib/utils";

type Mode = "signup" | "login";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <div className="space-y-5">
      <ModeSelector mode={mode} onChange={setMode} />

      <AnimatePresence mode="wait">
        {mode === "signup" && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignupForm />
          </motion.div>
        )}
        {mode === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <LoginForm />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeSelector({
  mode,
  onChange,
}: {
  mode: Mode | null;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onChange("signup")}
        className={cn(
          "group relative overflow-hidden rounded-[var(--radius-lg)] p-5 text-left transition-all",
          "border-2 active:scale-[0.98]",
          mode === "signup"
            ? "border-[var(--color-primary)] shadow-[var(--shadow-md)]"
            : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-sm)]",
        )}
        style={{ background: "var(--gradient-card-primary)" }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] mb-3 shadow-[var(--shadow-sm)]">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            Soy nuevo
          </p>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            Crea tu PIN para empezar a jugar
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-medium text-[var(--color-primary)]">
            Crear cuenta
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange("login")}
        className={cn(
          "group relative overflow-hidden rounded-[var(--radius-lg)] p-5 text-left transition-all",
          "border-2 active:scale-[0.98]",
          mode === "login"
            ? "border-[var(--color-info)] shadow-[var(--shadow-md)]"
            : "border-[var(--color-border)] hover:border-[var(--color-info)]/50 hover:shadow-[var(--shadow-sm)]",
        )}
        style={{ background: "var(--gradient-card-info)" }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-info)] text-[var(--color-info-fg)] mb-3 shadow-[var(--shadow-sm)]">
            <LogIn className="h-5 w-5" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            Ya tengo cuenta
          </p>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            Entra con tu nombre y PIN
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-medium text-[var(--color-info)]">
            Iniciar sesión
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
    </div>
  );
}

function SignupForm() {
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerAction,
    {},
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-1">
        Crear cuenta
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        Solo necesitas un nombre y un PIN de 4 dígitos.
      </p>

      <form action={formAction} className="space-y-5">
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
            <p className="text-sm text-[var(--color-danger)]">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">Tu PIN (4 dígitos)</Label>
          <PinInput id="pin" name="pin" value={pin} onChange={setPin} />
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
          <p className="text-sm text-[var(--color-danger)] text-center">{state.error}</p>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={pending || pin.length < 4 || pinConfirm.length < 4}
        >
          {pending ? "Creando..." : "Crear mi cuenta"}
        </Button>
      </form>
    </div>
  );
}

function LoginForm() {
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    {},
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-1">
        Entrar
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        Ingresa tu nombre y PIN de 4 dígitos.
      </p>

      <form action={formAction} className="space-y-5">
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
            <p className="text-sm text-[var(--color-danger)]">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">PIN</Label>
          <PinInput id="pin" name="pin" value={pin} onChange={setPin} />
          {state.fieldErrors?.pin && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {state.fieldErrors.pin}
            </p>
          )}
        </div>

        {state.error && !state.fieldErrors && (
          <p className="text-sm text-[var(--color-danger)] text-center">{state.error}</p>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={pending || pin.length < 4}
        >
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
