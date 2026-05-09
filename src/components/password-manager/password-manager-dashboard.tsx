"use client";

import * as React from "react";
import { Check, Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { usePasswordManager } from "@/contexts/password-manager-context";
import { newPmId } from "@/lib/password-manager/local-storage";
import type { PasswordEntry } from "@/lib/password-manager/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  function onCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

const emptyForm = {
  title: "",
  url: "",
  username: "",
  password: "",
  category: "",
  notes: "",
};

export function PasswordManagerDashboard() {
  const { state, setState, hydrated, error, setError } = usePasswordManager();

  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("All");

  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [showFormPw, setShowFormPw] = React.useState(false);

  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(new Set());

  function toggleVisible(id: string) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    for (const e of state.entries) {
      if (e.category) cats.add(e.category);
    }
    return ["All", ...Array.from(cats).sort()];
  }, [state.entries]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return state.entries
      .filter((e) => {
        if (categoryFilter !== "All" && e.category !== categoryFilter) return false;
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          (e.url ?? "").toLowerCase().includes(q) ||
          (e.username ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [state.entries, search, categoryFilter]);

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowFormPw(false);
    setShowForm(true);
  }

  function openEdit(entry: PasswordEntry) {
    setForm({
      title: entry.title,
      url: entry.url ?? "",
      username: entry.username ?? "",
      password: entry.password,
      category: entry.category ?? "",
      notes: entry.notes ?? "",
    });
    setEditingId(entry.id);
    setShowFormPw(false);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.password.trim()) { setError("Password is required."); return; }
    setError(null);

    const now = new Date().toISOString();
    if (editingId) {
      setState((prev) => ({
        ...prev,
        entries: prev.entries.map((x) =>
          x.id !== editingId
            ? x
            : {
                ...x,
                title: form.title.trim(),
                url: form.url.trim() || null,
                username: form.username.trim() || null,
                password: form.password,
                category: form.category.trim() || null,
                notes: form.notes.trim() || null,
              }
        ),
      }));
    } else {
      const entry: PasswordEntry = {
        id: newPmId(),
        title: form.title.trim(),
        url: form.url.trim() || null,
        username: form.username.trim() || null,
        password: form.password,
        category: form.category.trim() || null,
        notes: form.notes.trim() || null,
        logged_at: now,
      };
      setState((prev) => ({ ...prev, entries: [entry, ...prev.entries] }));
    }
    closeForm();
  }

  function onDelete(id: string) {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter((x) => x.id !== id),
    }));
  }

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Passwords</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" />
          Add
        </Button>
      </header>

      {error ? (
        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit entry" : "New entry"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pm-title">Title *</Label>
                  <Input
                    id="pm-title"
                    placeholder="Google, GitHub…"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pm-url">URL</Label>
                  <Input
                    id="pm-url"
                    placeholder="https://example.com"
                    value={form.url}
                    onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pm-username">Username / Email</Label>
                  <Input
                    id="pm-username"
                    placeholder="user@example.com"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pm-password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="pm-password"
                      type={showFormPw ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      className="pr-9"
                      autoComplete="new-password"
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                      onClick={() => setShowFormPw((v) => !v)}
                    >
                      {showFormPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pm-category">Category</Label>
                  <Input
                    id="pm-category"
                    placeholder="Work, Personal, Finance…"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pm-notes">Notes</Label>
                  <Input
                    id="pm-notes"
                    placeholder="Optional notes"
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <Plus className="size-4" />
                  {editingId ? "Update" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  <X className="size-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Search + category filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search title, URL, username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {categories.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Entries list */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {state.entries.length === 0
            ? "No passwords saved yet. Click Add to get started."
            : "No entries match your search."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => {
            const pwVisible = visibleIds.has(entry.id);
            return (
              <li
                key={entry.id}
                className="bg-card rounded-xl border border-border px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground font-semibold">{entry.title}</span>
                      {entry.category ? (
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                          {entry.category}
                        </span>
                      ) : null}
                    </div>

                    {entry.url ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={entry.url.startsWith("http") ? entry.url : `https://${entry.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary min-w-0 truncate text-xs hover:underline"
                        >
                          {entry.url}
                        </a>
                        <CopyButton value={entry.url} />
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-1.5">
                      {entry.username ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-20 shrink-0 text-xs">Username</span>
                          <span className="truncate">{entry.username}</span>
                          <CopyButton value={entry.username} />
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-20 shrink-0 text-xs">Password</span>
                        <span className="font-mono tracking-widest">
                          {pwVisible ? entry.password : "••••••••"}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => toggleVisible(entry.id)}
                          aria-label={pwVisible ? "Hide password" : "Show password"}
                        >
                          {pwVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                        <CopyButton value={entry.password} />
                      </div>
                    </div>

                    {entry.notes ? (
                      <p className="text-muted-foreground text-xs">{entry.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Edit"
                      onClick={() => openEdit(entry)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Delete"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
