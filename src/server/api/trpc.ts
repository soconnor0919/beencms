import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { operationEvent } from "~/server/db/schema";
import { resolveMemberSite, resolvePublicSiteId } from "~/lib/sites";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: opts.headers });
  const [membership, publicSiteId] = await Promise.all([
    session?.user
      ? resolveMemberSite(opts.headers, session.user.id)
      : Promise.resolve(null),
    resolvePublicSiteId(opts.headers),
  ]);
  return {
    db,
    session,
    siteId: publicSiteId,
    memberSiteId: membership?.siteId ?? null,
    siteRole: membership?.role ?? null,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ ctx, next, path }) => {
  const start = Date.now();
  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  try {
    const result = await next();
    console.log(`[TRPC] ${path} took ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    await db
      .insert(operationEvent)
      .values({
        siteId: ctx.memberSiteId ?? ctx.siteId,
        level: "error",
        source: `trpc:${path}`,
        message:
          error instanceof Error ? error.message : "Unknown request error",
      })
      .catch(() => undefined);
    throw error;
  }
});

export const publicProcedure = t.procedure.use(timingMiddleware);

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      siteId: ctx.memberSiteId ?? ctx.siteId,
      siteRole: ctx.siteRole,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceAuth);

const enforceEditor = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const role = ctx.siteRole;
  if (!role || !["owner", "admin", "editor"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: ctx.session,
      role,
      siteId: ctx.memberSiteId ?? ctx.siteId,
    },
  });
});

const enforceReviewer = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const role = ctx.siteRole;
  if (!role || !["owner", "admin", "editor", "reviewer"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: ctx.session,
      role,
      siteId: ctx.memberSiteId ?? ctx.siteId,
    },
  });
});

const enforceAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const role = ctx.siteRole;
  if (!role || !["owner", "admin"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: ctx.session,
      role,
      siteId: ctx.memberSiteId ?? ctx.siteId,
    },
  });
});

export const editorProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceEditor);
export const reviewerProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceReviewer);
export const adminProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceAdmin);
