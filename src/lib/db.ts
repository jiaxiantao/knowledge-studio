import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConnectionString: string | undefined;
  dbUnavailable?: boolean;
  dbProbePromise?: Promise<boolean>;
};

function getConnectionString() {
  return process.env.DATABASE_URL;
}

function createPrismaClient(
  connectionString: string,
  log: Prisma.LogLevel[] = process.env.NODE_ENV === "development"
    ? ["warn", "error"]
    : ["error"],
) {
  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
    log,
  });
}

function getPrismaClient(): PrismaClient | null {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return null;
  }

  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaConnectionString !== connectionString
  ) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
    globalForPrisma.dbUnavailable = false;
    globalForPrisma.dbProbePromise = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(connectionString);
    globalForPrisma.prismaConnectionString = connectionString;
  }

  return globalForPrisma.prisma;
}

export function isDbConnectionError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? String((error as { code: unknown }).code) : "";

  return (
    code === "P1000" ||
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND"
  );
}

export function markDbUnavailable(error?: unknown) {
  if (globalForPrisma.dbUnavailable) {
    return;
  }

  globalForPrisma.dbUnavailable = true;
  globalForPrisma.dbProbePromise = Promise.resolve(false);

  if (process.env.NODE_ENV !== "production") {
    const reason =
      error && isDbConnectionError(error)
        ? "PostgreSQL is unreachable"
        : "PostgreSQL is unavailable";

    console.warn(
      `[db] ${reason} — using static/in-memory fallbacks. Run \`docker compose up -d db && pnpm db:setup\`.`,
    );
  }
}

export function isDbMarkedUnavailable() {
  return Boolean(globalForPrisma.dbUnavailable);
}

export function getDb() {
  if (!getConnectionString() || globalForPrisma.dbUnavailable) {
    return null;
  }

  return getPrismaClient();
}

export async function probeDbConnection(force = false) {
  if (!force && globalForPrisma.dbUnavailable) {
    return false;
  }

  const connectionString = getConnectionString();

  if (!connectionString) {
    return false;
  }

  if (!force && globalForPrisma.dbProbePromise) {
    return globalForPrisma.dbProbePromise;
  }

  if (force) {
    globalForPrisma.dbUnavailable = false;
  }

  globalForPrisma.dbProbePromise = (async () => {
    // Dedicated silent client: avoids prisma:error spam when Postgres is down.
    const probeClient = createPrismaClient(connectionString, []);

    try {
      await probeClient.$queryRaw`SELECT 1`;
      await probeClient.$disconnect();
      globalForPrisma.dbUnavailable = false;
      return true;
    } catch (error) {
      await probeClient.$disconnect().catch(() => undefined);
      markDbUnavailable(error);
      return false;
    }
  })();

  return globalForPrisma.dbProbePromise;
}

export async function getReadyDb() {
  if (!(await probeDbConnection())) {
    return null;
  }

  return getDb();
}
