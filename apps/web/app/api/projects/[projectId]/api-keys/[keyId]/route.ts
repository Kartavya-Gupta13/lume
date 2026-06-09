import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKey, project, organization, organizationMember } from "@workspace/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; keyId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, keyId } = await params;

  // Verify the user has access to this project's org
  const [membership] = await db
    .select({ id: organizationMember.id })
    .from(organizationMember)
    .innerJoin(organization, eq(organization.id, organizationMember.organizationId))
    .innerJoin(project, eq(project.organizationId, organization.id))
    .where(
      and(
        eq(project.id, projectId),
        eq(organizationMember.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.id, keyId), eq(apiKey.projectId, projectId)));

  return new NextResponse(null, { status: 204 });
}
