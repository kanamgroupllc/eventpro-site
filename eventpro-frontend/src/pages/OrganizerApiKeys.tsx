import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  LayoutGrid,
  Calendar,
  Users,
  Palette,
  Key,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Loader2,
  Copy,
  Trash2,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ApiKey, CreateApiKeyResponse } from "@/types/api";

/**
 * Enterprise API keys — same capabilities as former Profile block; lives under Organizer hub.
 */
const OrganizerApiKeys = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const enterprise = (user?.subscriptionTier ?? "BASIC").toUpperCase() === "ENTERPRISE";

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [createKeyName, setCreateKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<CreateApiKeyResponse | null>(null);
  const [createKeySubmitting, setCreateKeySubmitting] = useState(false);

  const fetchApiKeys = useCallback(() => {
    if (!enterprise) {
      setApiKeysLoading(false);
      setApiKeys([]);
      return;
    }
    setApiKeysLoading(true);
    apiService
      .listApiKeys()
      .then(setApiKeys)
      .catch(() => setApiKeys([]))
      .finally(() => setApiKeysLoading(false));
  }, [enterprise]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateApiKey = () => {
    const name = createKeyName.trim();
    if (!name) {
      toast({ title: "Enter a name for the API key", variant: "destructive" });
      return;
    }
    setCreateKeySubmitting(true);
    apiService
      .createApiKey(name)
      .then((result) => {
        setNewKeyResult(result);
        setCreateKeyName("");
        fetchApiKeys();
        toast({ title: "API key created", description: "Copy it now — it won't be shown again." });
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        toast({
          title: err?.response?.data?.message ?? "Failed to create API key",
          variant: "destructive",
        });
      })
      .finally(() => setCreateKeySubmitting(false));
  };

  const handleCopyKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    toast({ title: "Copied to clipboard" });
  };

  const handleRevokeApiKey = (id: string) => {
    if (!confirm("Revoke this API key? It will stop working immediately.")) return;
    apiService
      .revokeApiKey(id)
      .then(() => {
        fetchApiKeys();
        if (newKeyResult?.id === id) setNewKeyResult(null);
        toast({ title: "API key revoked" });
      })
      .catch(() => toast({ title: "Failed to revoke API key", variant: "destructive" }));
  };

  return (
    <PageShell>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
        <aside className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-card/90">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold">Enterprise Suite</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin console</p>
              </div>
            </div>
            <nav className="space-y-1 text-sm">
              <Link to="/organizer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <LayoutGrid className="h-4 w-4" />
                Dashboard
              </Link>
              <Link to="/organizer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Calendar className="h-4 w-4" />
                Events
              </Link>
              <Link to="/organizer/team" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Users className="h-4 w-4" />
                Team
              </Link>
              <Link to="/organizer/branding" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Palette className="h-4 w-4" />
                Branding
              </Link>
              <span className="flex items-center gap-2 rounded-xl px-3 py-2 bg-primary/12 text-primary font-medium">
                <Key className="h-4 w-4" />
                API keys
              </span>
              <Link
                to="/organizer#organizer-financial"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
              <Link to="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </nav>
            <div className="pt-6 border-t border-border/60 space-y-2 text-sm text-muted-foreground">
              <Link to="/help" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Support
              </Link>
              <Link to="/login" className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-10 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Organizer Hub | Integrations</p>
              <h1 className="text-3xl font-bold font-headline mt-1">API keys</h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Use keys for programmatic access to your organizer data. Send the key in the{" "}
                <code className="rounded bg-muted px-1 text-xs">X-Api-Key</code> header.
              </p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" type="button" onClick={() => navigate("/notifications")} aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
          </div>

          {!enterprise ? (
            <Card className="rounded-3xl border-border/60">
              <CardContent className="p-8">
                <p className="text-muted-foreground mb-4">
                  API keys are available on the <strong>Enterprise</strong> plan.
                </p>
                <Button asChild className="rounded-2xl">
                  <Link to="/pricing">View plans</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-border/60">
              <CardContent className="p-6">
                {newKeyResult && (
                  <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                      Your new API key (copy now — it won&apos;t be shown again)
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="flex-1 min-w-0 break-all rounded bg-muted px-2 py-1.5 text-sm font-mono">{newKeyResult.key}</code>
                      <Button type="button" variant="secondary" size="sm" onClick={() => handleCopyKey(newKeyResult.key)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setNewKeyResult(null)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <Label htmlFor="api-key-name" className="sr-only">
                    Key name
                  </Label>
                  <Input
                    id="api-key-name"
                    placeholder="e.g. Production API"
                    className="max-w-xs rounded-xl"
                    value={createKeyName}
                    onChange={(e) => setCreateKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateApiKey()}
                  />
                  <Button type="button" className="rounded-2xl" onClick={handleCreateApiKey} disabled={createKeySubmitting || !createKeyName.trim()}>
                    {createKeySubmitting ? "Creating…" : "Create API key"}
                  </Button>
                </div>

                {apiKeysLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading keys…
                  </div>
                ) : apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No API keys yet. Create one above.</p>
                ) : (
                  <ul className="space-y-2">
                    {apiKeys.map((k) => (
                      <li
                        key={k.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-3"
                      >
                        <div>
                          <span className="font-medium">{k.name}</span>
                          <span className="text-muted-foreground text-sm ml-2 font-mono">{k.keyPrefix}…</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {k.createdAt ? format(new Date(k.createdAt), "MMM d, yyyy") : ""}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeApiKey(k.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </PageShell>
  );
};

export default OrganizerApiKeys;
