import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, ShoppingBag, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Event, EventAddon } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORIES = [
  { value: "merchandise", label: "Merchandise" },
  { value: "addon", label: "Add-on" },
  { value: "upgrade", label: "Upgrade" },
];

function canUseAddons(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

const EventEnhancements = () => {
  const navigate = useNavigate();
  const { id: eventId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [addons, setAddons] = useState<EventAddon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<EventAddon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    category: "addon",
    imageUrl: "",
    sizesStr: "",
    isPopular: false,
    displayOrder: 0,
  });

  useEffect(() => {
    if (!eventId) return;
    if (user && !canUseAddons(user.subscriptionTier)) {
      setIsLoading(false);
      return;
    }
    loadData();
  }, [eventId, user?.subscriptionTier]);

  const loadData = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      const [eventData, addonsData] = await Promise.all([
        apiService.getEvent(eventId),
        apiService.getOrganizerEventAddons(eventId),
      ]);
      setEvent(eventData);
      setAddons(addonsData);
    } catch (error: any) {
      console.error("Failed to load:", error);
      const status = error?.response?.status;
      const message = error?.response?.data?.message || "Failed to load event";
      setLoadError(message);
      toast.error(message);
      // Only redirect on auth/forbidden so user isn't stuck
      if (status === 401 || status === 403) {
        navigate("/organizer");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: 0,
      category: "addon",
      imageUrl: "",
      sizesStr: "",
      isPopular: false,
      displayOrder: addons.length,
    });
    setEditingAddon(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (addon: EventAddon) => {
    setEditingAddon(addon);
    setForm({
      name: addon.name,
      description: addon.description ?? "",
      price: addon.price,
      category: addon.category,
      imageUrl: addon.imageUrl ?? "",
      sizesStr: (addon.sizes ?? []).join(", "),
      isPopular: addon.isPopular ?? false,
      displayOrder: addon.displayOrder ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!eventId || !form.name.trim() || form.price <= 0) {
      toast.error("Name and positive price are required");
      return;
    }
    const sizes = form.sizesStr
      ? form.sizesStr.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    try {
      setIsSubmitting(true);
      if (editingAddon) {
        await apiService.updateEventAddon(eventId, editingAddon.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: form.price,
          category: form.category,
          imageUrl: form.imageUrl.trim() || undefined,
          sizes,
          isPopular: form.isPopular,
          displayOrder: form.displayOrder,
        });
        toast.success("Enhancement updated");
      } else {
        await apiService.createEventAddon(eventId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: form.price,
          category: form.category,
          imageUrl: form.imageUrl.trim() || undefined,
          sizes,
          isPopular: form.isPopular,
          displayOrder: form.displayOrder,
        });
        toast.success("Enhancement added");
      }
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (addon: EventAddon) => {
    if (!eventId || !confirm(`Delete "${addon.name}"?`)) return;
    try {
      await apiService.deleteEventAddon(eventId, addon.id);
      toast.success("Enhancement removed");
      loadData();
    } catch (error: any) {
      toast.error("Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && !canUseAddons(user.subscriptionTier)) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-md">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/organizer">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Merchandise & add-ons
              </CardTitle>
              <CardDescription>
                Sell merchandise, add-ons, and upgrades at checkout. This feature is available on Pro and Enterprise plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro to unlock add-ons and increase your revenue per event.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link to="/pricing">View plans</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/organizer">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadError && !event) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/organizer">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Card className="mt-4">
            <CardContent className="pt-6">
              <p className="text-destructive">{loadError}</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/organizer">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/organizer">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Enhance Your Experience</h1>
            <p className="text-muted-foreground">
              Add merchandise, add-ons, and upgrades for <strong>{event.name}</strong>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Enhancements
              </CardTitle>
              <CardDescription>
                These appear at checkout so attendees can add them to their order.
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add enhancement
            </Button>
          </CardHeader>
          <CardContent>
            {addons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No enhancements yet.</p>
                <Button variant="outline" onClick={openCreate}>
                  Add your first enhancement
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {addons.map((addon) => (
                  <li
                    key={addon.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{addon.name}</span>
                        {addon.isPopular && (
                          <Badge variant="secondary">Popular</Badge>
                        )}
                        <Badge variant="outline">
                          {CATEGORIES.find((c) => c.value === addon.category)?.label ?? addon.category}
                        </Badge>
                      </div>
                      {addon.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {addon.description}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-primary mt-1">
                        ${Number(addon.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(addon)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(addon)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex gap-4">
          <Button variant="outline" asChild>
            <Link to={`/organizer/events/${eventId}/tickets`}>Tickets</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/organizer">Back to events</Link>
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddon ? "Edit enhancement" : "Add enhancement"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Event T-Shirt"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price || ""}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Sizes (optional, comma-separated)</Label>
              <Input
                value={form.sizesStr}
                onChange={(e) => setForm((f) => ({ ...f, sizesStr: e.target.value }))}
                placeholder="e.g. S, M, L, XL"
              />
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="popular"
                checked={form.isPopular}
                onCheckedChange={(c) => setForm((f) => ({ ...f, isPopular: !!c }))}
              />
              <Label htmlFor="popular">Mark as Popular</Label>
            </div>
            <div>
              <Label>Display order (0 = first)</Label>
              <Input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {editingAddon ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventEnhancements;
