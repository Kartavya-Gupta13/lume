export default async function ProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-sm font-medium">No traces yet</p>
        <p className="text-xs text-muted-foreground">
          Instrument your app with the Lume SDK and traces will appear here.
        </p>
        <a
          href={`/${orgSlug}/${projectSlug}/settings`}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          Get your API key →
        </a>
      </div>
    </div>
  );
}
