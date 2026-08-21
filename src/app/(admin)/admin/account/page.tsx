"use client";

import { useState } from "react";
import { authClient, useSession } from "~/lib/auth-client";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
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
import { toast } from "sonner";

export default function AccountSecurityPage() {
  const session = useSession();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const enabled = Boolean(session.data?.user.twoFactorEnabled);
  const begin = async () => {
    const result = await authClient.twoFactor.enable({
      password,
      issuer: "hadlockCMS",
    });
    if (result.error) toast.error(result.error.message);
    else if (result.data?.method === "totp") {
      setSetup(result.data);
      setPassword("");
    } else
      toast.error(
        "Authenticator setup is unavailable. Check the two-factor provider configuration.",
      );
  };
  const verify = async () => {
    const result = await authClient.twoFactor.verifyTotp({ code });
    if (result.error) toast.error(result.error.message);
    else {
      setSetup(null);
      setCode("");
      await session.refetch();
      toast.success("Two-factor authentication enabled");
    }
  };
  const disable = async () => {
    const result = await authClient.twoFactor.disable({ password });
    if (result.error) toast.error(result.error.message);
    else {
      setPassword("");
      await session.refetch();
      toast.success("Two-factor authentication disabled");
    }
  };
  return (
    <PageContent
      maxWidth="max-w-3xl"
      header={
        <PageHeader
          title="Account Security"
          description="Manage password protection and two-factor authentication."
        />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Authenticator app</CardTitle>
          <CardDescription>
            {enabled
              ? "Two-factor authentication is enabled for your account."
              : "Require a one-time code when signing in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {setup ? (
            <>
              <div className="rounded-lg border bg-muted p-4">
                <p className="text-sm font-medium">
                  Add this account to your authenticator app
                </p>
                <code className="mt-2 block break-all text-xs">
                  {setup.totpURI}
                </code>
              </div>
              <div>
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
              <Button
                disabled={code.length !== 6}
                onClick={() => void verify()}
              >
                Verify and enable
              </Button>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Recovery codes</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Store these somewhere safe. Each code can be used once.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-1 font-mono text-xs">
                  {setup.backupCodes.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="password">Current password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button
                variant={enabled ? "destructive" : "default"}
                disabled={!password}
                onClick={() => void (enabled ? disable() : begin())}
              >
                {enabled
                  ? "Disable two-factor authentication"
                  : "Set up two-factor authentication"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
