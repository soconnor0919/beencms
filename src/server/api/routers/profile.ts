import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { user, userProfile } from "~/server/db/schema";

export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const record = await ctx.db
      .select({
        name: user.name,
        email: user.email,
        image: user.image,
        displayName: userProfile.displayName,
        bio: userProfile.bio,
        avatarUrl: userProfile.avatarUrl,
        timezone: userProfile.timezone,
        locale: userProfile.locale,
        emailNotifications: userProfile.emailNotifications,
      })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .where(eq(user.id, ctx.session.user.id))
      .get();
    return (
      record ?? {
        name: ctx.session.user.name,
        email: ctx.session.user.email,
        image: null,
        displayName: null,
        bio: null,
        avatarUrl: null,
        timezone: "America/New_York",
        locale: "en-US",
        emailNotifications: true,
      }
    );
  }),
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        displayName: z.string().max(256).nullish(),
        bio: z.string().max(1000).nullish(),
        avatarUrl: z
          .string()
          .refine(
            (value) =>
              !value ||
              value.startsWith("/") ||
              z.string().url().safeParse(value).success,
            "Use an uploaded image or a valid URL",
          )
          .nullish(),
        timezone: z.string().min(1).max(80),
        locale: z.string().min(2).max(32),
        emailNotifications: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ctx.db.transaction((tx) => {
        tx.update(user)
          .set({
            name: input.name,
            image: input.avatarUrl || null,
            updatedAt: new Date(),
          })
          .where(eq(user.id, ctx.session.user.id))
          .run();
        tx.insert(userProfile)
          .values({
            userId: ctx.session.user.id,
            displayName: input.displayName || null,
            bio: input.bio || null,
            avatarUrl: input.avatarUrl || null,
            timezone: input.timezone,
            locale: input.locale,
            emailNotifications: input.emailNotifications,
          })
          .onConflictDoUpdate({
            target: userProfile.userId,
            set: {
              displayName: input.displayName || null,
              bio: input.bio || null,
              avatarUrl: input.avatarUrl || null,
              timezone: input.timezone,
              locale: input.locale,
              emailNotifications: input.emailNotifications,
            },
          })
          .run();
      });
      return { success: true };
    }),
});
