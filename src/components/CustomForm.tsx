"use client";

import { useState } from "react";
import Script from "next/script";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export type PublicFormField = {
  id: string;
  label: string;
  type: "text" | "email" | "textarea" | "select" | "checkbox" | "consent";
  required: boolean;
  options?: string[];
};

export default function CustomForm({
  formId,
  fields,
  submitLabel,
  successMessage,
}: {
  formId: string;
  fields: PublicFormField[];
  submitLabel: string;
  successMessage: string;
}) {
  const [data, setData] = useState<Record<string, string | boolean | string[]>>(
    {},
  );
  const [website, setWebsite] = useState("");
  const [complete, setComplete] = useState(false);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const submit = api.forms.submit.useMutation({
    onSuccess: () => setComplete(true),
  });
  if (complete)
    return (
      <p className="rounded-xl border bg-background p-6 text-center">
        {successMessage}
      </p>
    );
  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const captchaToken = String(
          new FormData(event.currentTarget).get("cf-turnstile-response") ?? "",
        );
        submit.mutate({
          formId,
          data,
          website,
          captchaToken,
          path: window.location.pathname,
        });
      }}
    >
      <div className="sr-only" aria-hidden="true">
        <Label htmlFor={`${formId}-website`}>Website</Label>
        <Input
          id={`${formId}-website`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          {field.type === "checkbox" || field.type === "consent" ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                name={field.id}
                type="checkbox"
                required={field.required}
                checked={Boolean(data[field.id])}
                onChange={(event) =>
                  setData({ ...data, [field.id]: event.target.checked })
                }
              />
              <span>{field.label}</span>
            </label>
          ) : (
            <>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required ? " *" : ""}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.id}
                  name={field.id}
                  autoComplete="off"
                  required={field.required}
                  value={String(data[field.id] ?? "")}
                  onChange={(event) =>
                    setData({ ...data, [field.id]: event.target.value })
                  }
                />
              ) : field.type === "select" ? (
                <select
                  id={field.id}
                  name={field.id}
                  required={field.required}
                  className="w-full rounded-md border bg-background p-2"
                  value={String(data[field.id] ?? "")}
                  onChange={(event) =>
                    setData({ ...data, [field.id]: event.target.value })
                  }
                >
                  <option value="">Choose…</option>
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  autoComplete={field.type === "email" ? "email" : "off"}
                  spellCheck={field.type === "email" ? false : undefined}
                  required={field.required}
                  value={String(data[field.id] ?? "")}
                  onChange={(event) =>
                    setData({ ...data, [field.id]: event.target.value })
                  }
                />
              )}
            </>
          )}
        </div>
      ))}
      {turnstileSiteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        </>
      ) : null}
      <div aria-live="polite">
        {submit.error ? (
          <p className="text-sm text-destructive">{submit.error.message}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
