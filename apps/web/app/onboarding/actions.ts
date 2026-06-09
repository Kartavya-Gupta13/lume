"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { organization, organizationMember } from "@workspace/db";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createOrg(
  userId: string,
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

  try {
    const [newOrg] = await db
      .insert(organization)
      .values({ name, slug: finalSlug })
      .returning({ id: organization.id, slug: organization.slug });

    if (!newOrg) throw new Error("Insert failed");

    await db.insert(organizationMember).values({
      organizationId: newOrg.id,
      userId,
      role: "owner",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("organization_slug_unique")) {
      return { error: "That slug is already taken. Try another." };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect(`/${finalSlug}`);
}
