"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { CmsBrand } from "~/components/CmsBrand";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    setError("");
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);
    if (result.error)
      setError(result.error.message ?? "The reset link is invalid or expired.");
    else router.push("/admin/login?password=reset");
  };
  const mismatch = confirmation.length > 0 && password !== confirmation;
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <CmsBrand showCompany className="flex justify-center" />
        <Card>
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>Use at least 12 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmation">Confirm password</Label>
              <Input
                id="confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            {mismatch ? (
              <p className="text-sm text-destructive">
                Passwords do not match.
              </p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              className="w-full"
              disabled={!token || loading || password.length < 12 || mismatch}
              onClick={() => void submit()}
            >
              {loading ? "Resetting…" : "Reset password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-secondary/50" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
