"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

type FieldType =
  "text" | "email" | "textarea" | "select" | "checkbox" | "consent";
type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};
const blank: {
  id?: string;
  name: string;
  slug: string;
  submitLabel: string;
  successMessage: string;
  notificationEmail: string;
  active: boolean;
  fields: FormField[];
} = {
  name: "",
  slug: "",
  submitLabel: "Submit",
  successMessage: "Thank you. Your response has been received.",
  notificationEmail: "",
  active: true,
  fields: [],
};

export default function FormsPage() {
  const forms = api.forms.getAll.useQuery();
  const save = api.forms.save.useMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const addField = () =>
    setForm({
      ...form,
      fields: [
        ...form.fields,
        { id: crypto.randomUUID(), label: "", type: "text", required: false },
      ],
    });
  return (
    <PageContent
      maxWidth="max-w-5xl"
      header={
        <PageHeader
          title="Forms"
          description="Build custom forms, collect consent, and manage submissions."
          actions={
            <Button
              onClick={() => {
                setForm(blank);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              New form
            </Button>
          }
        />
      }
    >
      <Card>
        <CardContent className="p-0">
          {forms.data?.length ? (
            <div className="divide-y">
              {forms.data.map((item) => (
                <div
                  key={item.id}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4"
                >
                  <button
                    className="min-w-0 flex-1 text-left hover:text-primary"
                    onClick={() => {
                      setForm({
                        id: item.id,
                        name: item.name,
                        slug: item.slug,
                        submitLabel: item.submitLabel,
                        successMessage: item.successMessage,
                        notificationEmail: item.notificationEmail ?? "",
                        active: item.active,
                        fields: JSON.parse(item.fields) as FormField[],
                      });
                      setOpen(true);
                    }}
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.slug} ·{" "}
                        {(JSON.parse(item.fields) as FormField[]).length} fields
                      </p>
                    </div>
                  </button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/forms/${item.id}`}>Submissions</Link>
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {item.active ? "Active" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No custom forms yet.
            </p>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form builder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                      slug:
                        form.slug ||
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                    })
                  }
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(event) =>
                    setForm({ ...form, slug: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-3">
              {form.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_140px_auto_auto]"
                >
                  <Input
                    value={field.label}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        fields: form.fields.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      })
                    }
                    placeholder="Field label"
                  />
                  <select
                    className="rounded-md border bg-background px-2 text-sm"
                    value={field.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        fields: form.fields.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, type: event.target.value as FieldType }
                            : item,
                        ),
                      })
                    }
                  >
                    {[
                      "text",
                      "email",
                      "textarea",
                      "select",
                      "checkbox",
                      "consent",
                    ].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fields: form.fields.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, required: event.target.checked }
                              : item,
                          ),
                        })
                      }
                    />
                    Required
                  </label>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        ...form,
                        fields: form.fields.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  {field.type === "select" ? (
                    <Input
                      className="sm:col-span-4"
                      value={field.options?.join(", ") ?? ""}
                      placeholder="Options separated by commas"
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fields: form.fields.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  options: event.target.value
                                    .split(",")
                                    .map((option) => option.trim())
                                    .filter(Boolean),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                  ) : null}
                </div>
              ))}
              <Button variant="outline" onClick={addField}>
                <Plus className="mr-2 size-4" />
                Add field
              </Button>
            </div>
            <div>
              <Label>Success message</Label>
              <Input
                value={form.successMessage}
                onChange={(event) =>
                  setForm({ ...form, successMessage: event.target.value })
                }
              />
            </div>
            <div>
              <Label>Notification email</Label>
              <Input
                type="email"
                value={form.notificationEmail}
                onChange={(event) =>
                  setForm({ ...form, notificationEmail: event.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name || !form.slug || form.fields.length === 0}
              onClick={async () => {
                await save.mutateAsync({
                  ...form,
                  notificationEmail: form.notificationEmail || null,
                });
                await forms.refetch();
                setOpen(false);
                toast.success("Form saved");
              }}
            >
              Save form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
