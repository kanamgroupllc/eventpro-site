import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Upload,
  X,
  ArrowLeft,
  LayoutDashboard,
  BarChart3,
  Users,
  FileText,
  ImageIcon,
  Clock,
  MapPin,
  Ticket,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { getEventImageUrl } from "@/lib/utils";
import type { SeatResponse } from "@/types/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EVENT_FORM_CATEGORIES } from "@eventpro/shared";
import { SeatMapBuilder } from "@/components/organizer/SeatMapBuilder";
import { VenueAddressMapPreview } from "@/components/VenueAddressMapPreview";

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().min(1, "Country is required"),
});

const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  category: z.string().min(1, "Category is required"),
  marketingEnabled: z.boolean().default(false),
  promotionalVideoUrl: z.string().max(500).optional(),
  eventPageTemplate: z.enum(["DEFAULT", "MINIMAL", "VIBRANT"]).default("DEFAULT"),
  donationsEnabled: z.boolean().default(false),
  customDomain: z.string().max(255).optional(),
  reservedSeatingEnabled: z.boolean().default(false),
  address: addressSchema,
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

function canUseAddons(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

const MAX_EVENT_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

const EventFormNew = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  const showProFeatures = canUseAddons(user?.subscriptionTier);

  const [imageFiles, setImageFiles] = useState<{ file: File; preview: string }[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [eventSeats, setEventSeats] = useState<SeatResponse[]>([]);
  const [isSeatMapSubmitting, setIsSeatMapSubmitting] = useState(false);
  const [seatMapSections, setSeatMapSections] = useState<Array<{ name: string; rowCount: number; seatsPerRow: number; price: number }>>([
    { name: "", rowCount: 1, seatsPerRow: 1, price: 0 },
  ]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      category: "",
      marketingEnabled: false,
      promotionalVideoUrl: "",
      eventPageTemplate: "DEFAULT",
      donationsEnabled: false,
      customDomain: "",
      reservedSeatingEnabled: false,
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    },
  });

  // Load existing event data in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadEventData(id);
    }
  }, [id, isEditMode]);

  const loadEventData = async (eventId: string) => {
    try {
      setIsLoading(true);
      const event = await apiService.getEvent(eventId);

      // Format dates for datetime-local input
      const formatDateTime = (dateStr: string | undefined): string => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 16);
      };

      const startRaw = event.startTime ?? event.startDateTime;
      const endRaw = event.endTime ?? event.endDateTime;

      form.reset({
        name: event.name,
        description: event.description || "",
        startTime: formatDateTime(startRaw),
        endTime: formatDateTime(endRaw),
        category: event.categoryName || event.category || "",
        marketingEnabled: event.marketingEnabled || false,
        promotionalVideoUrl: event.promotionalVideoUrl || "",
        eventPageTemplate: (event.eventPageTemplate as "DEFAULT" | "MINIMAL" | "VIBRANT") || "DEFAULT",
        donationsEnabled: event.donationsEnabled || false,
        customDomain: event.customDomain || "",
        reservedSeatingEnabled: event.reservedSeatingEnabled || false,
        address: {
          street: event.addressStreet || "",
          city: event.addressCity || "",
          state: event.addressState || "",
          zipCode: event.addressZipCode || "",
          country: event.addressCountry || "",
        },
      });

      if (event.imageUrl) {
        setExistingImageUrl(event.imageUrl);
      }
      if (event.additionalImageUrls?.length) {
        setExistingGalleryUrls(event.additionalImageUrls.map((u: string) => getEventImageUrl(u) ?? u));
      }
      if (event.reservedSeatingEnabled) {
        const seats = await apiService.getEventSeats(eventId);
        setEventSeats(seats);
      } else {
        setEventSeats([]);
      }
    } catch (error: any) {
      console.error("Failed to load event:", error);
      toast.error("Failed to load event data");
      navigate("/organizer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const currentCount = imageFiles.length + (existingImageUrl ? 1 : 0) + existingGalleryUrls.length;
    const remaining = MAX_EVENT_IMAGES - currentCount;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_EVENT_IMAGES} images allowed.`);
      return;
    }
    const toAdd: { file: File; preview: string }[] = [];
    const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (file.size > maxSize) {
        toast.error(`"${file.name}" must be less than ${MAX_FILE_SIZE_MB}MB`);
        continue;
      }
      toAdd.push({ file, preview: URL.createObjectURL(file) });
    }
    setImageFiles((prev) => [...prev, ...toAdd].slice(0, MAX_EVENT_IMAGES));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]?.preview ?? "");
      return next;
    });
  };

  const removeExistingImage = () => {
    setExistingImageUrl(null);
  };
  const removeExistingGallery = (index: number) => {
    setExistingGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const totalImageCount = imageFiles.length + (existingImageUrl ? 1 : 0) + existingGalleryUrls.length;
  const imagePreview = imageFiles[0]?.preview ?? existingImageUrl ? (getEventImageUrl(existingImageUrl) ?? existingImageUrl) : null;
  const hasAnyImage = imageFiles.length > 0 || existingImageUrl || existingGalleryUrls.length > 0;

  const onSubmit = async (values: EventFormValues) => {
    setIsSubmitting(true);

    try {
      // Format datetime as ISO string for Java LocalDateTime
      const formatLocalDateTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };

      if (isEditMode && id) {
        // UPDATE MODE - JSON PUT; upload first new image if present as new cover, then update with URL
        let imageUrl: string | undefined;
        if (imageFiles.length > 0) {
          const upload = await apiService.uploadEventImage(imageFiles[0].file);
          imageUrl = upload?.url;
        }
        const requestPayload = {
          name: values.name,
          description: values.description,
          startTime: formatLocalDateTime(values.startTime),
          endTime: formatLocalDateTime(values.endTime),
          category: values.category,
          marketingEnabled: values.marketingEnabled,
          address: values.address,
          ...(values.promotionalVideoUrl?.trim() && { promotionalVideoUrl: values.promotionalVideoUrl.trim() }),
          ...(values.eventPageTemplate && { eventPageTemplate: values.eventPageTemplate }),
          donationsEnabled: values.donationsEnabled,
          ...(values.customDomain?.trim() && { customDomain: values.customDomain.trim() }),
          reservedSeatingEnabled: values.reservedSeatingEnabled,
          ...(imageUrl && { imageUrl }),
        };
        await apiService.updateOrganizerEvent(id, requestPayload);
        // Add any extra new images as gallery (first was used as new cover if present)
        for (let i = 1; i < imageFiles.length; i++) {
          const { url } = await apiService.uploadEventImage(imageFiles[i].file);
          await apiService.addEventImage(id, { imageUrl: url, displayOrder: i });
        }
        toast.success("Draft saved");
      } else {
        // CREATE MODE - Use POST
        const formData = new FormData();

        const requestPayload = {
          name: values.name,
          description: values.description,
          startTime: formatLocalDateTime(values.startTime),
          endTime: formatLocalDateTime(values.endTime),
          category: values.category,
          marketingEnabled: values.marketingEnabled,
          address: values.address,
          ...(values.promotionalVideoUrl?.trim() && { promotionalVideoUrl: values.promotionalVideoUrl.trim() }),
          ...(values.eventPageTemplate && { eventPageTemplate: values.eventPageTemplate }),
          donationsEnabled: values.donationsEnabled,
          ...(values.customDomain?.trim() && { customDomain: values.customDomain.trim() }),
          reservedSeatingEnabled: values.reservedSeatingEnabled,
        };

        formData.append("request", JSON.stringify(requestPayload));

        imageFiles.forEach(({ file }) => {
          formData.append("imageFiles", file);
        });

        const createdEvent = await apiService.createEventWithImages(formData);
        const eventId = createdEvent.id;
        toast.success("Draft saved. Continue editing or add ticket tiers.");
        navigate(`/organizer/events/${eventId}/edit`);
      }
    } catch (error: any) {
      console.error("Failed to save event:", error);
      const message = error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} event`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setIsPublishing(true);
    try {
      await apiService.publishEvent(id);
      toast.success("Event published");
      navigate("/organizer");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to publish event");
    } finally {
      setIsPublishing(false);
    }
  };

  const goToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const organizerLabel =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Your organization";

  const studioSteps = [
    { id: "section-details" as const, label: "Details", icon: FileText },
    { id: "section-media" as const, label: "Media", icon: ImageIcon },
    { id: "section-schedule" as const, label: "Schedule", icon: Clock },
    { id: "section-location" as const, label: "Location", icon: MapPin },
    { id: "section-tickets" as const, label: "Tickets", icon: Ticket },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/organizer" className="flex items-center gap-2 font-semibold text-foreground shrink-0">
              <span className="rounded-lg bg-gradient-primary px-2 py-1 text-xs text-primary-foreground">KanamEvents</span>
              <span className="hidden sm:inline text-sm text-muted-foreground truncate">Studio</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              <Link to="/organizer" className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 opacity-60 cursor-not-allowed" title="Coming soon">
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics
              </span>
              <Link to="/organizer/team" className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
                <Users className="h-3.5 w-3.5" />
                Team
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => form.handleSubmit(onSubmit)()}>
              {isSubmitting ? "Saving…" : "Save draft"}
            </Button>
            {isEditMode && id ? (
              <Button
                type="button"
                size="sm"
                className="bg-gradient-primary"
                disabled={isPublishing}
                onClick={handlePublish}
              >
                {isPublishing ? "Publishing…" : "Publish event"}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <aside className="lg:w-56 shrink-0 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Event setup</p>
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {studioSteps.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => goToSection(id)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground whitespace-nowrap lg:whitespace-normal"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
            {isEditMode && id ? (
              <Button variant="outline" size="sm" className="w-full hidden lg:flex" asChild>
                <Link to={`/events/${id}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Preview live
                </Link>
              </Button>
            ) : null}
          </aside>

          <div className="flex-1 min-w-0">
            <Link to="/organizer" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>

            <Card className="border-border/80 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{isEditMode ? "Edit event" : "Create new event"}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isEditMode ? "Update details, then publish when you’re ready." : "Save a draft anytime. Add ticket tiers after your first save."}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                    <div id="section-details" className="space-y-6 scroll-mt-32">
                      <div>
                        <h3 className="text-lg font-semibold">General details</h3>
                        <p className="text-sm text-muted-foreground">Title, category, and story for your event page.</p>
                      </div>

                  {/* Event Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Midnight Neon Jazz Festival" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_FORM_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-lg border border-border/80 bg-muted/40 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organized by</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{organizerLabel}</p>
                  </div>

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your event"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Promotional video URL (YouTube/Vimeo) — Basic theming, all tiers */}
                  <FormField
                    control={form.control}
                    name="promotionalVideoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotional video (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Event page template */}
                  <FormField
                    control={form.control}
                    name="eventPageTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event page style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DEFAULT">Default</SelectItem>
                            <SelectItem value="MINIMAL">Minimal</SelectItem>
                            <SelectItem value="VIBRANT">Vibrant</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Donations & custom domain (Pro/Enterprise) */}
                  {showProFeatures && (
                    <div id="section-pro" className="space-y-4 scroll-mt-32">
                      <FormField
                        control={form.control}
                        name="donationsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Accept donations at checkout</FormLabel>
                              <p className="text-sm text-muted-foreground">Let attendees add an optional donation</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customDomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom domain (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="tickets.yourvenue.org"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reservedSeatingEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Reserved seating</FormLabel>
                              <p className="text-sm text-muted-foreground">Sell by specific seat (section, row, number). After saving, create a seat map below.</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                    </div>

                  <div id="section-media" className="space-y-6 scroll-mt-32">
                    <div>
                      <h3 className="text-lg font-semibold">Media gallery</h3>
                      <p className="text-sm text-muted-foreground">Hero image and extras. First image is the cover (recommended 1600×900).</p>
                    </div>
                  <div className="space-y-2">
                    <Label>Hero & gallery</Label>
                    <p className="text-sm text-muted-foreground">Up to {MAX_EVENT_IMAGES} images. First upload is the hero.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {existingImageUrl && (
                        <div className="relative aspect-video rounded-lg overflow-hidden border">
                          <img
                            src={getEventImageUrl(existingImageUrl) ?? existingImageUrl}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">Hero</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7"
                            onClick={removeExistingImage}
                            title="Remove cover"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {existingGalleryUrls.map((url, idx) => (
                        <div key={`existing-${idx}`} className="relative aspect-video rounded-lg overflow-hidden border">
                          <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7"
                            onClick={() => removeExistingGallery(idx)}
                            title="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {imageFiles.map((item, index) => (
                        <div key={item.preview} className="relative aspect-video rounded-lg overflow-hidden border">
                          <img src={item.preview} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
                            {index === 0 && !existingImageUrl ? "Hero" : `Image ${index + 1}`}
                          </span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7"
                            onClick={() => removeImage(index)}
                            title="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {totalImageCount < MAX_EVENT_IMAGES && (
                        <label
                          htmlFor="image-upload"
                          className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors gap-1 p-2"
                        >
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                            id="image-upload"
                          />
                          <span className="text-xs text-muted-foreground text-center px-2">
                            Upload ({totalImageCount}/{MAX_EVENT_IMAGES})
                          </span>
                        </label>
                      )}
                    </div>
                    {!hasAnyImage && (
                      <p className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_MB}MB per image.</p>
                    )}
                  </div>
                  </div>

                  <div id="section-schedule" className="space-y-6 scroll-mt-32">
                    <div>
                      <h3 className="text-lg font-semibold">Schedule</h3>
                      <p className="text-sm text-muted-foreground">When your event starts and ends.</p>
                    </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  </div>

                  <div id="section-location" className="space-y-6 scroll-mt-32">
                    <div>
                      <h3 className="text-lg font-semibold">Location</h3>
                      <p className="text-sm text-muted-foreground">Where the event takes place — shown on your public page.</p>
                    </div>
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Venue address</Label>

                    <FormField
                      control={form.control}
                      name="address.street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main Street" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address.zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="Country" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <VenueAddressMapPreview
                      street={form.watch("address.street")}
                      city={form.watch("address.city")}
                      state={form.watch("address.state")}
                      zipCode={form.watch("address.zipCode")}
                      country={form.watch("address.country")}
                    />
                  </div>
                  </div>

                  {/* Marketing Enabled */}
                  <FormField
                    control={form.control}
                    name="marketingEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Marketing
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Allow this event to be featured in marketing campaigns
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Seat map (edit only, Pro/Enterprise, when reserved seating enabled) */}
                  {isEditMode && id && form.watch("reservedSeatingEnabled") && (
                    <SeatMapBuilder
                      id="section-seat-map"
                      eventId={id}
                      showProFeatures={showProFeatures}
                      seatMapSections={seatMapSections}
                      setSeatMapSections={setSeatMapSections}
                      eventSeats={eventSeats}
                      setEventSeats={setEventSeats}
                      isSeatMapSubmitting={isSeatMapSubmitting}
                      setIsSeatMapSubmitting={setIsSeatMapSubmitting}
                      variant="embedded"
                    />
                  )}

                  <div id="section-tickets" className="scroll-mt-32 space-y-3 rounded-xl border border-border/80 bg-muted/20 p-5">
                    <h3 className="text-lg font-semibold">Ticket tiers</h3>
                    <p className="text-sm text-muted-foreground">
                      Set prices, capacity, and sale status in the ticket manager (matches your Stitch tier table).
                    </p>
                    {isEditMode && id ? (
                      <Button type="button" variant="outline" asChild>
                        <Link to={`/organizer/events/${id}/tickets`}>Manage ticket tiers</Link>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Save your draft first — you’ll add tiers on the next step.</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate("/organizer")}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-gradient-primary" disabled={isSubmitting}>
                      {isSubmitting ? "Saving…" : "Save draft"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventFormNew;
