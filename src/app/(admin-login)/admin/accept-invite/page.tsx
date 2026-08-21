"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
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

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const accept = api.users.acceptInvite.useMutation({
    onSuccess: () => router.push("/admin/login?invitation=accepted"),
  });
  const mismatch = confirmation.length > 0 && password !== confirmation;

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <CmsBrand showCompany className="flex justify-center" />
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Choose a password with at least 12 characters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
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
            {accept.error ? (
              <p className="text-sm text-destructive">{accept.error.message}</p>
            ) : null}
            <Button
              className="w-full"
              disabled={
                !token || password.length < 12 || mismatch || accept.isPending
              }
              onClick={() => accept.mutate({ token, password })}
            >
              {accept.isPending ? "Creating account…" : "Create account"}
            </Button>
            <Button variant="link" className="w-full" asChild>
              <Link href="/admin/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-secondary/50" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
