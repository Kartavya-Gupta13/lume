import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKey, project, organization, organizationMember } from "@workspace/db";

async function assertProjectAccess(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ orgId: project.organizationId })
    .from(project)
    .innerJoin(organization, eq(organization.id, project.organizationId))
    .innerJoin(
      organizationMember,
      eq(organizationMember.organizationId, organization.id),
    )
    .where(eq(project.id, projectId))
    .limit(1);

  if (!row) return false;

  const [membership] = await db
    .select({ id: organizationMember.id })
    .from(organizationMember)
    .where(eq(organizationMember.userId, userId))
    .limit(1);

  return !!membership;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  const hasAccess = await assertProjectAccess(projectId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const keys = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      lastFour: apiKey.lastFour,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
    })
    .from(apiKey)
    .where(eq(apiKey.projectId, projectId))
    .orderBy(apiKey.createdAt);

  return NextResponse.json({ keys });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  const hasAccess = await assertProjectAccess(projectId, session.user.id);
  if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const rawKey = `lsk_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const prefix = rawKey.slice(0, 8);
  const lastFour = rawKey.slice(-4);

  const [created] = await db
    .insert(apiKey)
    .values({ projectId, name, keyHash, prefix, lastFour })
    .returning({ id: apiKey.id });

  return NextResponse.json({ id: created!.id, key: rawKey }, { status: 201 });
}
