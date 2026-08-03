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
import { Calendar, Upload, X, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EVENT_FORM_CATEGORIES } from "@eventpro/shared";
import { apiService } from "@/lib/api";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().min(1, "Country is required"),
});

const ticketTypeSchema = z.object({
  name: z.string().min(1, "Ticket name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  totalQuantity: z.number().min(1, "Quantity must be at least 1"),
});

const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  category: z.string().min(1, "Category is required"),
  marketingEnabled: z.boolean().default(false),
  address: addressSchema,
  ticketTypes: z.array(ticketTypeSchema).min(1, "At least one ticket type is required"),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const MAX_EVENT_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

const EventForm = () => {
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      category: "",
      marketingEnabled: false,
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      ticketTypes: [
        {
          name: "",
          description: "",
          price: 0,
          totalQuantity: 100,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ticketTypes",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = MAX_EVENT_IMAGES - imageFiles.length;
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
      toAdd.push({
        file,
        preview: URL.createObjectURL(file),
      });
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

  const onSubmit = async (values: EventFormValues) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Format datetime as ISO string for Java LocalDateTime (requires jackson-datatype-jsr310)
      const formatLocalDateTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      
      // Create the request JSON matching backend CreateEventRequest
      const requestPayload = {
        name: values.name,
        description: values.description,
        startTime: formatLocalDateTime(values.startTime),
        endTime: formatLocalDateTime(values.endTime),
        category: values.category,
        marketingEnabled: values.marketingEnabled,
        address: values.address,
      };
      
      // Append request as JSON string
      formData.append("request", JSON.stringify(requestPayload));
      
      // Append image files (max 5)
      if (imageFiles.length > 0) {
        imageFiles.forEach(({ file }) => formData.append("imageFiles", file));
      }

      await apiService.createEventWithImages(formData);
      toast.success("Event created successfully!");
      navigate("/organizer");
    } catch (error: any) {
      console.error("Failed to create event:", error);
      const message = error.response?.data?.message || "Failed to create event";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Create New Event</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Event Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter event name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  {/* Date/Time */}
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

                  {/* Address Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Event Address</Label>
                    
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
                              <Input placeholder="United States" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Event Images (max 5) */}
                  <div className="space-y-2">
                    <Label>Event Images (up to {MAX_EVENT_IMAGES})</Label>
                    <p className="text-sm text-muted-foreground">
                      First image is the cover. Max {MAX_FILE_SIZE_MB}MB per image.
                    </p>
                    {imageFiles.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {imageFiles.map(({ preview }, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Event ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <div className="absolute top-1 left-1 rounded bg-black/60 text-white text-xs px-1.5 py-0.5">
                              {index === 0 ? "Cover" : index + 1}
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-7 w-7 opacity-90"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {imageFiles.length < MAX_EVENT_IMAGES && (
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">
                          Add image ({imageFiles.length}/{MAX_EVENT_IMAGES})
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          multiple
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>

                  {/* Marketing Toggle */}
                  <FormField
                    control={form.control}
                    name="marketingEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Marketing</FormLabel>
                          <FormDescription>
                            Allow promotional emails and featured listings
                          </FormDescription>
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

                  {/* Ticket Types */}
                  <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Ticket Types</CardTitle>
                        <CardDescription>Define different ticket options for attendees</CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          append({
                            name: "",
                            description: "",
                            price: 0,
                            totalQuantity: 100,
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Ticket Type
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="border-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-lg">
                            Ticket Type {index + 1}
                          </CardTitle>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`ticketTypes.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ticket Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="VIP Access" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`ticketTypes.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price ($)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="49.99"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`ticketTypes.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="What's included with this ticket?"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`ticketTypes.${index}.totalQuantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Available Quantity</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="100"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/organizer")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Event"}
                  </Button>
                </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default EventForm;
