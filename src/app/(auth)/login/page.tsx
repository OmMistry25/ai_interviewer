"use client";

import { signIn, signUp } from "../actions";
import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LogIn, UserPlus } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Cliq</h1>
          <p className="text-slate-500">AI-Powered Hiring Platform</p>
        </div>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-amber-500" />
            Sign In
          </h2>
          <form action={signInAction} className="space-y-4">
            <Input
              name="email"
              type="email"
              label="Email"
              placeholder="you@company.com"
              required
            />
            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              required
            />
            <Button type="submit" variant="primary" className="w-full">
              Sign In
            </Button>
            {signInState?.error && (
              <p className="text-red-400 text-sm">{signInState.error}</p>
            )}
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-slate-500" />
            Create Account
          </h2>
          <form action={signUpAction} className="space-y-4">
            <Input
              name="email"
              type="email"
              label="Email"
              placeholder="you@company.com"
              required
            />
            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="Min 6 characters"
              required
            />
            <Button type="submit" variant="secondary" className="w-full">
              Sign Up
            </Button>
            {signUpState?.error && (
              <p className="text-red-400 text-sm">{signUpState.error}</p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
