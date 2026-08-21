"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { PageHeader } from "~/components/admin/PageHeader";
import { PageContent } from "~/components/admin/PageContent";

type Role = "owner" | "admin" | "editor" | "reviewer" | "viewer";
type AssignableRole = Exclude<Role, "owner">;

const ROLE_COLORS: Record<Role, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-primary/10 text-primary border-primary/20",
  editor:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  reviewer: "bg-muted text-foreground border-border",
  viewer: "bg-muted text-muted-foreground border-border",
};

function TableSkeleton() {
  return (
    <div className="space-y-px">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-4 border-b last:border-0"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-7 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const { data: users = [], refetch, isLoading } = api.users.getAll.useQuery();
  const inviteMutation = api.users.invite.useMutation();
  const updateRoleMutation = api.users.updateRole.useMutation();
  const deleteMutation = api.users.delete.useMutation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "editor" as AssignableRole,
  });
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    setSaving(true);
    try {
      const result = await inviteMutation.mutateAsync(form);
      if (result.invitationUrl) {
        await navigator.clipboard.writeText(result.invitationUrl);
        toast.success(
          "SMTP is not configured. Invitation link copied to your clipboard.",
        );
      } else {
        toast.success(`${form.name} invited as ${form.role}`);
      }
      setInviteOpen(false);
      setForm({ name: "", email: "", role: "editor" });
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to invite user");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: AssignableRole) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      toast.success("Role updated");
      await refetch();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ userId });
      toast.success(`${name} removed`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove user");
    }
  };

  return (
    <PageContent
      header={
        <PageHeader
          title="Users"
          description="Manage who can access the admin panel."
          actions={
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          }
        />
      }
    >
      {/* Users table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin Users
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">No users yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {u.name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        disabled={u.role === "owner"}
                        value={u.role}
                        onChange={(e) =>
                          void handleRoleChange(
                            u.id,
                            e.target.value as AssignableRole,
                          )
                        }
                        className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer ${ROLE_COLORS[u.role as Role]}`}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground tabular-nums">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDelete(u.id, u.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Role legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" /> Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(["owner", "admin", "editor", "reviewer", "viewer"] as Role[]).map(
              (role, i) => (
                <div key={role}>
                  {i > 0 && <Separator className="sm:hidden mb-4" />}
                  <Badge
                    className={`${ROLE_COLORS[role]} mb-2`}
                    variant="outline"
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {role === "owner" &&
                      "Site ownership, members, settings, and all content"}
                    {role === "admin" &&
                      "Full access: users, settings, all content"}
                    {role === "editor" &&
                      "Edit & publish content, team, programs"}
                    {role === "reviewer" &&
                      "Review content and join editorial workflows"}
                    {role === "viewer" &&
                      "Read-only: view dashboard & messages"}
                  </p>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as AssignableRole })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="admin">Admin — full access</option>
                <option value="editor">Editor — content & team</option>
                <option value="reviewer">Reviewer — review workflows</option>
                <option value="viewer">Viewer — read only</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleInvite()}
              disabled={saving || !form.name || !form.email}
            >
              {saving ? "Inviting…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
