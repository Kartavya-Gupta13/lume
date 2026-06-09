"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { project, organization } from "@workspace/db";
import { eq } from "drizzle-orm";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createProject(
  orgSlug: string,
  formData: FormData,
): Promise<{ error: string } | never> {
  const name = (formData.get("name") as string | null)?.trim();
  const slug = (formData.get("slug") as string | null)?.trim();

  if (!name || name.length < 2) {
    return { error: "Name must be at least 2 characters" };
  }

  const finalSlug = slug || toSlug(name);

  if (!/^[a-z0-9-]+$/.test(finalSlug) || finalSlug.length < 2) {
    return { error: "Slug must be lowercase letters, numbers, and hyphens only" };
  }

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!org) {
    return { error: "Organization not found" };
  }

  try {
    await db.insert(project).values({
      organizationId: org.id,
      name,
      slug: finalSlug,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("project_org_slug_unique")) {
      return { error: "A project with that slug already exists in this organization." };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect(`/${orgSlug}/${finalSlug}`);
}
