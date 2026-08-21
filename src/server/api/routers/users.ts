import { z } from "zod";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  user,
  userProfile,
  auditLog,
  userInvitation,
  account,
  siteMembership,
} from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";
import { sendUserInvitation } from "~/lib/email";
import { getSitePlan } from "~/lib/billing";
import { plans } from "~/lib/plans";

export const usersRouter = createTRPCRouter({
  getAll: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        role: siteMembership.role,
      })
      .from(user)
      .innerJoin(siteMembership, eq(user.id, siteMembership.userId))
      .where(eq(siteMembership.siteId, ctx.siteId));

    return users.map((u) => ({ ...u, role: u.role ?? ("viewer" as const) }));
  }),

  invite: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["admin", "editor", "reviewer", "viewer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const existing = ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .get();
      const existingMembership = existing
        ? ctx.db
            .select({ userId: siteMembership.userId })
            .from(siteMembership)
            .where(
              and(
                eq(siteMembership.siteId, ctx.siteId),
                eq(siteMembership.userId, existing.id),
              ),
            )
            .get()
        : null;
      if (!existingMembership) {
        const [members, pendingInvitations] = await Promise.all([
          ctx.db
            .select({ id: siteMembership.userId })
            .from(siteMembership)
            .where(eq(siteMembership.siteId, ctx.siteId)),
          ctx.db
            .select({ id: userInvitation.id })
            .from(userInvitation)
            .where(
              and(
                eq(userInvitation.siteId, ctx.siteId),
                isNull(userInvitation.acceptedAt),
                gt(userInvitation.expiresAt, new Date()),
                ne(userInvitation.email, email),
              ),
            ),
        ]);
        const plan = getSitePlan(ctx.siteId);
        if (
          members.length + pendingInvitations.length >=
          plans[plan].memberLimit
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `${plans[plan].name} supports ${plans[plan].memberLimit} team member${plans[plan].memberLimit === 1 ? "" : "s"}. Upgrade the site plan to invite another person.`,
          });
      }
      if (existing) {
        await ctx.db
          .insert(siteMembership)
          .values({ siteId: ctx.siteId, userId: existing.id, role: input.role })
          .onConflictDoUpdate({
            target: [siteMembership.siteId, siteMembership.userId],
            set: { role: input.role },
          });
        return { delivered: false, invitationUrl: undefined };
      }
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await ctx.db
        .delete(userInvitation)
        .where(
          and(
            eq(userInvitation.siteId, ctx.siteId),
            eq(userInvitation.email, email),
          ),
        );
      await ctx.db.insert(userInvitation).values({
        id: randomUUID(),
        siteId: ctx.siteId,
        email,
        name: input.name,
        role: input.role,
        tokenHash,
        invitedBy: ctx.session.user.id,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });
      const url = `${env.BETTER_AUTH_URL}/admin/accept-invite?token=${encodeURIComponent(token)}`;
      const delivered = await sendUserInvitation({
        email,
        name: input.name,
        role: input.role,
        url,
      });

      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "users.invite",
        entity: "user",
        detail: `${input.name} <${email}> as ${input.role}`,
      });
      return { delivered, invitationUrl: delivered ? undefined : url };
    }),

  acceptInvite: publicProcedure
    .input(
      z.object({
        token: z.string().min(20),
        password: z.string().min(12).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const invitation = ctx.db
        .select()
        .from(userInvitation)
        .where(
          and(
            eq(userInvitation.tokenHash, tokenHash),
            gt(userInvitation.expiresAt, new Date()),
          ),
        )
        .get();
      if (!invitation || invitation.acceptedAt)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation is invalid or expired.",
        });
      const members = await ctx.db
        .select({ id: siteMembership.userId })
        .from(siteMembership)
        .where(eq(siteMembership.siteId, invitation.siteId));
      const plan = getSitePlan(invitation.siteId);
      if (members.length >= plans[plan].memberLimit)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This site's team member limit has been reached.",
        });
      const existing = ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, invitation.email))
        .get();
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "This account already exists.",
        });
      const userId = randomUUID();
      const now = new Date();
      const password = await hashPassword(input.password);
      ctx.db.transaction((tx) => {
        tx.insert(user)
          .values({
            id: userId,
            name: invitation.name,
            email: invitation.email,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        tx.insert(account)
          .values({
            id: randomUUID(),
            issuer: "local:credential",
            accountId: userId,
            providerId: "credential",
            userId,
            password,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        tx.insert(userProfile).values({ userId, role: "viewer" }).run();
        tx.insert(siteMembership)
          .values({ siteId: invitation.siteId, userId, role: invitation.role })
          .run();
        tx.update(userInvitation)
          .set({ acceptedAt: now })
          .where(eq(userInvitation.id, invitation.id))
          .run();
      });
      return { email: invitation.email };
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "editor", "reviewer", "viewer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db
        .select({ role: siteMembership.role })
        .from(siteMembership)
        .where(
          and(
            eq(siteMembership.siteId, ctx.siteId),
            eq(siteMembership.userId, input.userId),
          ),
        )
        .get();
      if (
        (current?.role === "owner" || current?.role === "admin") &&
        input.role !== "admin"
      ) {
        const admins = await ctx.db
          .select({ userId: siteMembership.userId })
          .from(siteMembership)
          .where(
            and(
              eq(siteMembership.siteId, ctx.siteId),
              eq(siteMembership.role, "admin"),
            ),
          );
        const owners = await ctx.db
          .select({ userId: siteMembership.userId })
          .from(siteMembership)
          .where(
            and(
              eq(siteMembership.siteId, ctx.siteId),
              eq(siteMembership.role, "owner"),
            ),
          );
        if (admins.length + owners.length <= 1)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The final site administrator cannot be demoted.",
          });
      }
      await ctx.db
        .insert(siteMembership)
        .values({ siteId: ctx.siteId, userId: input.userId, role: input.role })
        .onConflictDoUpdate({
          target: [siteMembership.siteId, siteMembership.userId],
          set: { role: input.role },
        })
        .run();

      // Get target user email for the log
      const target = await ctx.db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, input.userId))
        .get();
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "users.updateRole",
        entity: "user",
        detail: `${target?.name ?? input.userId} → ${input.role}`,
      });
    }),

  delete: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your own account",
        });
      }
      const targetProfile = await ctx.db
        .select({ role: siteMembership.role })
        .from(siteMembership)
        .where(
          and(
            eq(siteMembership.siteId, ctx.siteId),
            eq(siteMembership.userId, input.userId),
          ),
        )
        .get();
      if (targetProfile?.role === "owner" || targetProfile?.role === "admin") {
        const privileged = await ctx.db
          .select({ userId: siteMembership.userId })
          .from(siteMembership)
          .where(
            and(
              eq(siteMembership.siteId, ctx.siteId),
              eq(siteMembership.role, targetProfile.role),
            ),
          );
        if (privileged.length <= 1)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The final site administrator cannot be removed.",
          });
      }
      const target = await ctx.db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, input.userId))
        .get();
      await ctx.db
        .delete(siteMembership)
        .where(
          and(
            eq(siteMembership.siteId, ctx.siteId),
            eq(siteMembership.userId, input.userId),
          ),
        )
        .run();
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "users.delete",
        entity: "user",
        detail: target?.email ?? input.userId,
      });
    }),
});
