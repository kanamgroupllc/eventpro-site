import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Lock, Shield, CheckCircle2 } from "lucide-react";

/**
 * Stitch-style mock for configuring the Event Reviewer role (local state only).
 */
const AdminEventReviewerPermissions = () => {
  const { toast } = useToast();
  const [approveEvents, setApproveEvents] = useState(true);
  const [reviewArtists, setReviewArtists] = useState(false);
  const [manageInvites, setManageInvites] = useState(true);
  const [auditLogs, setAuditLogs] = useState(false);

  const save = () => {
    toast({
      title: "Preferences saved",
      description: "Reviewer role settings are stored for this session. Wire to your RBAC API when ready.",
    });
  };

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="rounded-full font-normal gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Access control
          </Badge>
        </div>
        <h1 className="text-2xl font-bold font-headline tracking-tight text-foreground mb-2">Role configuration</h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-xl">
          These settings customize operational boundaries and dictate platform visibility and action capabilities for the
          Event Reviewer role.
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">Events</h2>
            <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-border/60">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">Approve pending events</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Allow user to validate and publish event submissions to the public feed.
                    </p>
                  </div>
                  <Switch checked={approveEvents} onCheckedChange={setApproveEvents} />
                </div>
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">Review artist profiles</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Access to private artist data and portfolio verification tools.
                    </p>
                  </div>
                  <Switch checked={reviewArtists} onCheckedChange={setReviewArtists} />
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">Users</h2>
            <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">Manage team invitations</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send and revoke invitation links for new internal staff members.
                  </p>
                </div>
                <Switch checked={manageInvites} onCheckedChange={setManageInvites} />
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">Platform</h2>
            <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-border/60">
                <div className="p-4 flex items-start justify-between gap-4 opacity-60">
                  <div className="min-w-0 flex gap-2">
                    <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">View revenue data</p>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          Pro only
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Restricted on your current plan.</p>
                    </div>
                  </div>
                  <Switch checked={false} disabled className="pointer-events-none" />
                </div>
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">Access audit logs</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Read-only access to system change history and security events.
                    </p>
                  </div>
                  <Switch checked={auditLogs} onCheckedChange={setAuditLogs} />
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-md overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-2 mb-3">
                <Shield className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold font-headline">Editorial oversight</p>
                  <p className="text-sm text-primary-foreground/90 mt-1">
                    Reviewers are the final filter for platform quality. Align permissions with internal compliance before
                    publishing.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-xs font-medium uppercase tracking-wider text-primary-foreground/80 mt-4 pt-4 border-t border-primary-foreground/20">
                <span>Status: Active role</span>
                <span>Assigned: 12 users</span>
              </div>
            </CardContent>
          </Card>

          <Button
            type="button"
            className="w-full h-12 rounded-2xl font-headline gap-2 bg-primary text-primary-foreground"
            onClick={save}
          >
            <CheckCircle2 className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminEventReviewerPermissions;
