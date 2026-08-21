"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { CmsBrand } from "~/components/CmsBrand";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const verify = async () => { setLoading(true); const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: true }); setLoading(false); if (result.error) setError(result.error.message ?? "Invalid verification code"); else router.push("/admin"); };
  return <main className="flex min-h-screen items-center justify-center bg-secondary/50 px-4"><div className="w-full max-w-sm space-y-6"><CmsBrand showCompany className="flex justify-center" /><Card><CardHeader><CardTitle>Two-factor verification</CardTitle><CardDescription>Enter the six-digit code from your authenticator app.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-1.5"><Label htmlFor="code">Verification code</Label><Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button className="w-full" disabled={code.length !== 6 || loading} onClick={() => void verify()}>{loading ? "Verifying…" : "Verify"}</Button></CardContent></Card></div></main>;
}
