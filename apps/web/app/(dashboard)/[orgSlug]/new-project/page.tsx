import { ProjectForm } from "./project-form";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm px-4 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Create a project</h1>
          <p className="text-sm text-muted-foreground">
            Projects group your traces and evaluations.
          </p>
        </div>
        <ProjectForm orgSlug={orgSlug} />
      </div>
    </div>
  );
}
