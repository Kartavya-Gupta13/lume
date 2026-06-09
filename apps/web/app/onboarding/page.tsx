import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organization, organizationMember } from "@workspace/db";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  // Already has an org — skip onboarding
  const existingMemberships = await db
    .select({ slug: organization.slug })
    .from(organizationMember)
    .innerJoin(organization, eq(organizationMember.organizationId, organization.id))
    .where(eq(organizationMember.userId, session.user.id))
    .limit(1);

  if (existingMemberships.length > 0) {
    redirect(`/${existingMemberships[0]!.slug}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Create your organization</h1>
          <p className="text-sm text-muted-foreground">
            This is your team's workspace in Lume.
          </p>
        </div>
        <OnboardingForm userId={session.user.id} />
      </div>
    </div>
  );
}
