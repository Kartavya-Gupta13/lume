"use client";

import { useState, useTransition } from "react";
import { createOrg } from "./actions";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OnboardingForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(toSlug(value));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createOrg(userId, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Organization name
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Acme Inc."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="slug" className="text-sm font-medium">
          URL slug
        </label>
        <div className="flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">
          <span className="text-muted-foreground select-none">lume.dev/</span>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="acme"
            className="flex-1 bg-transparent outline-none"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
