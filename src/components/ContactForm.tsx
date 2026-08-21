"use client";

import { useState } from "react";
import Script from "next/script";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

const emptyForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

export default function ContactForm({
  buttonLabel = "Send Message",
  className = "",
}: {
  buttonLabel?: string;
  className?: string;
}) {
  const [form, setForm] = useState(emptyForm);
  const submit = api.contact.submit.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      (
        window as unknown as { turnstile?: { reset(): void } }
      ).turnstile?.reset();
    },
  });
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <form
      className={`space-y-4 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const captchaToken = String(
          new FormData(event.currentTarget).get("cf-turnstile-response") ?? "",
        );
        submit.mutate({ ...form, captchaToken });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </div>
      </div>
      <div>
        <Label htmlFor="contact-subject">Subject</Label>
        <Input
          id="contact-subject"
          name="subject"
          autoComplete="off"
          value={form.subject}
          onChange={(event) =>
            setForm({ ...form, subject: event.target.value })
          }
        />
      </div>
      <div className="absolute -left-[10000px]" aria-hidden="true">
        <Label htmlFor="contact-website">Website</Label>
        <Input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) =>
            setForm({ ...form, website: event.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          autoComplete="off"
          required
          rows={6}
          value={form.message}
          onChange={(event) =>
            setForm({ ...form, message: event.target.value })
          }
        />
      </div>
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
        {submit.isSuccess ? (
          <p className="text-sm text-emerald-600">
            Thanks—your message was sent.
          </p>
        ) : null}
        {submit.error ? (
          <p className="text-sm text-destructive">{submit.error.message}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Sending…" : buttonLabel}
      </Button>
    </form>
  );
}
