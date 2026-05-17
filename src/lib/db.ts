/* eslint-disable no-console */
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { headers } from "next/headers";
import { PrismaClient } from "../generated/prisma";

/**
 * Prisma client singleton — PostgreSQL only.
 *
 * Local dev:  Run `npx prisma dev` for a zero-install local Postgres.
 * Production: Set DATABASE_URL to your Supabase/Postgres connection string.
 *
 * Uses globalThis to survive Next.js HMR in development.
 */

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function applyTenantIsolation(client: PrismaClient) {
    // Use Prisma Client Extension to inject RLS
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({
 model, operation, args, query
}: { model: string, operation: string, args: Record<string, unknown>, query: (args: unknown) => unknown }) {
                    let tenantSubdomain = null;
                    try {
                        const headersList = await headers();
                        tenantSubdomain = headersList.get("x-tenant-subdomain");
                    } catch {
                        // Not in a request context (e.g. scripts, background jobs)
                    }

                    if (tenantSubdomain && model !== 'Workspace' && model !== 'WorkspaceMember') {
                        args = args || {};

                        // Inject into data for creates
                        if (operation === 'create' || operation === 'createMany') {
                            if (Array.isArray(args.data)) {
                                args.data = args.data.map((d: Record<string, unknown>) => ({ ...d, tenantId: tenantSubdomain }));
                            } else if (args.data && typeof args.data === 'object') {
                                (args.data as Record<string, unknown>).tenantId = tenantSubdomain;
                            }
                        }

                        // Inject into data for updates
                        if (operation === 'update' || operation === 'updateMany') {
                            if (args.data && typeof args.data === 'object') (args.data as Record<string, unknown>).tenantId = tenantSubdomain;
                        }
                        if (operation === 'upsert') {
                            if (args.create && typeof args.create === 'object') (args.create as Record<string, unknown>).tenantId = tenantSubdomain;
                            if (args.update && typeof args.update === 'object') (args.update as Record<string, unknown>).tenantId = tenantSubdomain;
                        }

                        // Inject into where filters
                        if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'upsert'].includes(operation)) {
                            args.where = { ...((args.where as Record<string, unknown>) || {}), tenantId: tenantSubdomain };
                        }

                        return query(args);
                    }
                    return query(args);
                },
            },
        },
    }) as unknown as PrismaClient; // Cast to avoid complex type issues in consuming code for now
}

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;

    // During Next.js build time, DATABASE_URL might not be set.
    // We shouldn't throw synchronously here to avoid breaking static generation.
    if (!connectionString) {
        console.warn("[db] DATABASE_URL is not set. Database operations will fail until it is provided.");
        // Return a dummy proxy that throws only when an operation is actually attempted
        return new Proxy({}, {
            get(target, prop) {
                if (prop === '$extends') return () => target; // needed for applyTenantIsolation
                throw new Error("[db] DATABASE_URL is missing. Please set it to a PostgreSQL connection string.");
            }
        }) as PrismaClient;
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });

    return applyTenantIsolation(client);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
