"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import ImageUpload from "~/components/admin/ImageUpload";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export default function ProfilePage() {
  const { data, refetch } = api.profile.get.useQuery();
  const update = api.profile.update.useMutation();
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    timezone: "America/New_York",
    locale: "en-US",
    emailNotifications: true,
  });
  useEffect(() => {
    if (data)
      setForm({
        name: data.name,
        displayName: data.displayName ?? "",
        bio: data.bio ?? "",
        avatarUrl: data.avatarUrl ?? data.image ?? "",
        timezone: data.timezone ?? "America/New_York",
        locale: data.locale ?? "en-US",
        emailNotifications: data.emailNotifications ?? true,
      });
  }, [data]);
  const save = async () => {
    try {
      await update.mutateAsync({
        ...form,
        displayName: form.displayName || null,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null,
      });
      toast.success("Profile updated");
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update your profile",
      );
    }
  };
  return (
    <PageContent
      maxWidth="max-w-4xl"
      header={
        <PageHeader
          title="Your profile"
          description="Personal details and preferences that follow you across every site."
          actions={
            <Button
              onClick={() => void save()}
              disabled={!data || update.isPending}
            >
              <Save data-icon="inline-start" />
              {update.isPending ? "Saving…" : "Save profile"}
            </Button>
          }
        />
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>
              Your email is managed by your sign-in account; these fields
              control how collaborators see you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                <Input
                  id="profile-name"
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
                <FieldLabel htmlFor="profile-display-name">
                  Display name
                </FieldLabel>
                <Input
                  id="profile-display-name"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="How your byline should appear"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-bio">Biography</FieldLabel>
                <Textarea
                  id="profile-bio"
                  rows={5}
                  value={form.bio}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bio: event.target.value,
                    }))
                  }
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="profile-timezone">Timezone</FieldLabel>
                  <Input
                    id="profile-timezone"
                    value={form.timezone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        timezone: event.target.value,
                      }))
                    }
                  />
                  <FieldDescription>
                    IANA format, such as America/New_York.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-locale">Locale</FieldLabel>
                  <Input
                    id="profile-locale"
                    value={form.locale}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        locale: event.target.value,
                      }))
                    }
                    placeholder="en-US"
                  />
                </Field>
              </div>
              <FieldSet>
                <FieldLegend>Email notifications</FieldLegend>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={form.emailNotifications ? "enabled" : "disabled"}
                  onValueChange={(value) =>
                    value &&
                    setForm((current) => ({
                      ...current,
                      emailNotifications: value === "enabled",
                    }))
                  }
                >
                  <ToggleGroupItem value="enabled">Enabled</ToggleGroupItem>
                  <ToggleGroupItem value="disabled">Disabled</ToggleGroupItem>
                </ToggleGroup>
              </FieldSet>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              onClick={() => void save()}
              disabled={!data || update.isPending}
            >
              Save profile
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profile image</CardTitle>
            <CardDescription>
              Shown in editorial assignments and activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={form.avatarUrl}
              onChange={(avatarUrl) =>
                setForm((current) => ({ ...current, avatarUrl }))
              }
            />
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
