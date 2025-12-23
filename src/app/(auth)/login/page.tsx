"use client";

import { signIn, signUp } from "../actions";
import { useActionState } from "react";

export default function LoginPage() {
  const [signInState, signInAction] = useActionState(
    async (_: unknown, formData: FormData) => signIn(formData),
    null
  );
  const [signUpState, signUpAction] = useActionState(
    async (_: unknown, formData: FormData) => signUp(formData),
    null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-sm space-y-6 p-6">
        <h1 className="text-2xl font-bold text-white text-center">Login / Sign Up</h1>

        <form action={signInAction} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full p-3 rounded bg-zinc-800 text-white border border-zinc-700"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full p-3 rounded bg-zinc-800 text-white border border-zinc-700"
          />
          <button
            type="submit"
            className="w-full p-3 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Sign In
          </button>
          {signInState?.error && (
            <p className="text-red-400 text-sm">{signInState.error}</p>
          )}
        </form>

        <div className="text-center text-zinc-500">or</div>

        <form action={signUpAction} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full p-3 rounded bg-zinc-800 text-white border border-zinc-700"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            required
            className="w-full p-3 rounded bg-zinc-800 text-white border border-zinc-700"
          />
          <button
            type="submit"
            className="w-full p-3 rounded bg-zinc-700 text-white font-medium hover:bg-zinc-600"
          >
            Sign Up
          </button>
          {signUpState?.error && (
            <p className="text-red-400 text-sm">{signUpState.error}</p>
          )}
        </form>
      </div>
    </div>
  );
}

