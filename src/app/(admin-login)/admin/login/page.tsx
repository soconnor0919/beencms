"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "~/components/ThemeToggle";
import { CmsBrand } from "~/components/CmsBrand";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session-expired") {
      setNotice(
        "Your session expired. Sign in again to restore and finish setup.",
      );
    } else if (params.get("invitation") === "accepted") {
      setNotice("Your account is ready. Sign in to continue.");
    } else if (params.get("password") === "reset") {
      setNotice("Your password was reset. Sign in with your new password.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Invalid credentials");
    } else {
      const requested = new URLSearchParams(window.location.search).get("next");
      router.push(requested?.startsWith("/admin/") ? requested : "/admin");
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary/50 px-4">
      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <CmsBrand showCompany className="justify-center" />
          <p className="mt-3 text-sm text-muted-foreground">
            Content management workspace
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <h1 className="text-xl font-semibold leading-none">
              Admin Sign In
            </h1>
            <CardDescription>
              Enter your credentials to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/admin/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {notice && !error ? (
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                    in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
