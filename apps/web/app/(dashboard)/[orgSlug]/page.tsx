import Link from "next/link";

export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">No projects yet</p>
        <Link
          href={`/${orgSlug}/new-project`}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create project
        </Link>
      </div>
    </div>
  );
}
