"use client";

import { useState } from "react";
import { LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

export default function TemplatesPage() {
  const templates = api.templates.list.useQuery();
  const capture = api.templates.capture.useMutation();
  const stage = api.templates.stage.useMutation();
  const remove = api.templates.delete.useMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "custom",
  });

  const applyTemplate = async (id: string, overwriteMatching: boolean) => {
    if (
      overwriteMatching &&
      !confirm(
        "Replace drafts for matching pages and sections? Published content remains live until you publish the new drafts.",
      )
    )
      return;
    try {
      const result = await stage.mutateAsync({
        id,
        overwriteMatching,
        confirmation: overwriteMatching ? "APPLY" : undefined,
      });
      toast.success(
        `Template staged: ${result.layoutsApplied} layouts, ${result.pagesApplied} pages, ${result.sectionsApplied} sections`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template failed");
    }
  };

  return (
    <PageContent
      maxWidth="max-w-6xl"
      header={
        <PageHeader
          title="Site Templates"
          description="Start from a complete site or save the active site as a reusable template. Template content is staged as drafts before publishing."
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus data-icon="inline-start" />
                  Save current site
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save site as a template</DialogTitle>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="template-name">Name</FieldLabel>
                    <Input
                      id="template-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="template-description">
                      Description
                    </FieldLabel>
                    <Textarea
                      id="template-description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                    <FieldDescription>
                      Captures the active design, standard page layouts, dynamic
                      pages, and reusable sections. Media stays in this
                      workspace and is referenced by URL.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="template-category">
                      Category
                    </FieldLabel>
                    <Input
                      id="template-category"
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!form.name.trim() || capture.isPending}
                    onClick={async () => {
                      await capture.mutateAsync({
                        name: form.name.trim(),
                        description: form.description.trim() || null,
                        category: form.category.trim() || "custom",
                      });
                      await templates.refetch();
                      setForm({
                        name: "",
                        description: "",
                        category: "custom",
                      });
                      setOpen(false);
                      toast.success("Site template saved");
                    }}
                  >
                    {capture.isPending ? "Saving…" : "Save template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />
      }
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {templates.data?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>
                {template.description ?? "A reusable site configuration."}
              </CardDescription>
              <CardAction>
                <Badge variant={template.builtIn ? "secondary" : "outline"}>
                  {template.builtIn ? "Built in" : "Custom"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LayoutTemplate />
                <span className="capitalize">{template.category}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-wrap gap-2">
              <Button
                onClick={() => void applyTemplate(template.id, false)}
                disabled={stage.isPending}
              >
                Stage new content
              </Button>
              <Button
                variant="outline"
                onClick={() => void applyTemplate(template.id, true)}
                disabled={stage.isPending}
              >
                Replace matches
              </Button>
              {!template.builtIn ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${template.name}`}
                  onClick={async () => {
                    if (!confirm(`Delete the ${template.name} template?`))
                      return;
                    await remove.mutateAsync({ id: template.id });
                    await templates.refetch();
                  }}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </CardFooter>
          </Card>
        ))}
      </div>
    </PageContent>
  );
}
