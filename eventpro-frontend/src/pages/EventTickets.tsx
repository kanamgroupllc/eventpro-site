import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Ticket, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Event, TicketType } from "@/types/api";
import { Badge } from "@/components/ui/badge";

function canUseAddons(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

type TicketFormData = {
  ticketType: "VIP" | "REGULAR" | "EARLY_BIRD";
  price: number;
  quantity: number;
};

const EventTickets = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<TicketFormData>({
    ticketType: "REGULAR",
    price: 0,
    quantity: 100,
  });

  useEffect(() => {
    if (id) {
      loadEventAndTickets(id);
    }
  }, [id]);

  const loadEventAndTickets = async (eventId: string) => {
    try {
      setIsLoading(true);
      const [eventData, ticketData] = await Promise.all([
        apiService.getEvent(eventId),
        apiService.getTicketTypes(eventId),
      ]);
      setEvent(eventData);
      setTickets(ticketData);
    } catch (error: any) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load event data");
      navigate("/organizer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTickets = async () => {
    if (!id) return;

    try {
      setIsSubmitting(true);

      // Use the organizer tickets endpoint
      const payload = {
        ticketType: formData.ticketType,
        price: formData.price,
        quantity: formData.quantity,
        name: `${formData.ticketType} Ticket`, // Auto-generate name
      };

      await apiService.createOrganizerTickets(id, payload);

      toast.success(`${formData.quantity} ${formData.ticketType} tickets created successfully!`);

      // Reload tickets
      await loadEventAndTickets(id);

      // Reset form and close dialog
      setFormData({
        ticketType: "REGULAR",
        price: 0,
        quantity: 100,
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to create tickets:", error);
      const message = error.response?.data?.message || "Failed to create tickets";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/10 text-green-500";
      case "SOLD_OUT":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading tickets...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <Link to="/organizer" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            {id && canUseAddons(user?.subscriptionTier) && (
              <Link to={`/organizer/events/${id}/enhancements`} className="text-sm text-muted-foreground hover:text-foreground">
                Enhance (add-ons)
              </Link>
            )}
          </div>

          {/* Event Info Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{event.name}</CardTitle>
                  <CardDescription>
                    Manage tickets for this event
                  </CardDescription>
                </div>
                {event.status === "DRAFT" && (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Tickets Section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Ticket className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Ticket Types</h2>
              <Badge variant="secondary">{tickets.length}</Badge>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tickets
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Tickets</DialogTitle>
                  <DialogDescription>
                    Add tickets for your event. You can create multiple batches of different ticket types.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketType">Ticket Type</Label>
                    <Select
                      value={formData.ticketType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, ticketType: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                        <SelectItem value="EARLY_BIRD">Early Bird</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTickets}
                    disabled={isSubmitting}
                    className="bg-gradient-primary"
                  >
                    {isSubmitting ? "Creating..." : "Create Tickets"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tickets List */}
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No tickets yet</p>
                <p className="text-sm text-muted-foreground">
                  Create tickets to start selling for this event
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{ticket.name}</h3>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="font-medium">${ticket.price.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Available</p>
                            <p className="font-medium">
                              {ticket.availableQuantity} / {ticket.totalQuantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sold</p>
                            <p className="font-medium">
                              {ticket.soldQuantity ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {tickets.length > 0 && event.status === "DRAFT" && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Ready to publish?</h3>
                    <p className="text-sm text-muted-foreground">
                      Your event has {tickets.length} ticket type(s) and is ready to be published.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        await apiService.publishEvent(id!);
                        toast.success("Event published successfully!");
                        navigate("/organizer");
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || "Failed to publish event");
                      }
                    }}
                    className="bg-gradient-primary"
                  >
                    Publish Event
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default EventTickets;
