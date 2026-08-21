"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "~/lib/auth-client";
import { CmsBrand } from "~/components/CmsBrand";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    await authClient.requestPasswordReset({ email, redirectTo: "/admin/reset-password" });
    setLoading(false);
    setSent(true);
  };
  return <main className="flex min-h-screen items-center justify-center bg-secondary/50 px-4"><div className="w-full max-w-sm space-y-6"><CmsBrand showCompany className="flex justify-center" /><Card><CardHeader><CardTitle>Reset your password</CardTitle><CardDescription>{sent ? "If that account exists, a secure reset link has been sent." : "Enter the email address associated with your account."}</CardDescription></CardHeader><CardContent className="space-y-4">{sent ? null : <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>}<Button className="w-full" disabled={loading || !email} onClick={() => void submit()}>{loading ? "Sending…" : sent ? "Email sent" : "Send reset link"}</Button><Button variant="link" className="w-full" asChild><Link href="/admin/login">Back to sign in</Link></Button></CardContent></Card></div></main>;
}
