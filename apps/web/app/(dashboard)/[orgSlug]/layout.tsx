import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organization, organizationMember, project } from "@workspace/db";
import { Sidebar } from "@/components/sidebar";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  // DashboardLayout already enforces auth, but we need session.user.id here
  if (!session) notFound();

  const [org] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .innerJoin(
      organizationMember,
      and(
        eq(organizationMember.organizationId, organization.id),
        eq(organizationMember.userId, session.user.id),
      ),
    )
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!org) notFound();

  const projects = await db
    .select({ id: project.id, name: project.name, slug: project.slug })
    .from(project)
    .where(eq(project.organizationId, org.id))
    .orderBy(project.createdAt);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar org={org} projects={projects} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
