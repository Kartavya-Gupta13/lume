"use client";

import { useState } from "react";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export function ApiKeysSection({
  projectId,
  keys: initialKeys,
}: {
  projectId: string;
  keys: ApiKey[];
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });

    if (!res.ok) {
      setError("Failed to create key. Try again.");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as { id: string; key: string };
    setRevealedKey(data.key);
    setCreating(false);
    setNewKeyName("");
    setLoading(false);

    // Refresh keys list from server response
    const listRes = await fetch(`/api/projects/${projectId}/api-keys`);
    if (listRes.ok) {
      const listData = (await listRes.json()) as { keys: ApiKey[] };
      setKeys(listData.keys);
    }
  }

  async function handleRevoke(keyId: string) {
    const res = await fetch(`/api/projects/${projectId}/api-keys/${keyId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setKeys((prev) =>
        prev.map((k) =>
          k.id === keyId ? { ...k, revokedAt: new Date() } : k,
        ),
      );
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">API Keys</h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-xs rounded-md border border-input px-3 py-1.5 hover:bg-accent transition-colors"
          >
            Create key
          </button>
        )}
      </div>

      {revealedKey && (
        <div className="rounded-md border border-border bg-muted/50 p-4 space-y-2">
          <p className="text-sm font-medium">Copy your API key now</p>
          <p className="text-xs text-muted-foreground">
            It will never be shown again.
          </p>
          <code className="block text-xs font-mono break-all select-all bg-background rounded px-2 py-1.5 border border-border">
            {revealedKey}
          </code>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(revealedKey);
            }}
            className="text-xs text-primary hover:underline"
          >
            Copy to clipboard
          </button>
          <div className="pt-1">
            <button
              onClick={() => setRevealedKey(null)}
              className="text-xs text-muted-foreground hover:underline"
            >
              I've saved it, dismiss
            </button>
          </div>
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            autoFocus
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. production)"
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewKeyName("");
            }}
            className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {keys.length === 0 && !creating ? (
        <p className="text-sm text-muted-foreground">No API keys yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{k.name}</span>
                  {k.revokedAt && (
                    <span className="text-xs text-destructive bg-destructive/10 rounded px-1.5 py-0.5">
                      Revoked
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {k.prefix}…{k.lastFour}
                </div>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt &&
                    ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                </div>
              </div>
              {!k.revokedAt && (
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
