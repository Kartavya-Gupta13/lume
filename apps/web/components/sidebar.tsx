import Link from "next/link";

type Org = { id: string; name: string; slug: string };
type Project = { id: string; name: string; slug: string };

export function Sidebar({
  org,
  projects,
}: {
  org: Org;
  projects: Project[];
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-border flex flex-col h-full bg-background">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold truncate">{org.name}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Projects
        </p>
        {projects.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">No projects</p>
        ) : (
          projects.map((p) => (
            <Link
              key={p.id}
              href={`/${org.slug}/${p.slug}`}
              className="flex items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {p.name}
            </Link>
          ))
        )}

        <Link
          href={`/${org.slug}/new-project`}
          className="flex items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          + New project
        </Link>
      </nav>
    </aside>
  );
}
