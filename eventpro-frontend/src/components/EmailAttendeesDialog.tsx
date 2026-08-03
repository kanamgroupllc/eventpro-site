import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";

interface EmailAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  onSuccess?: () => void;
}

export function EmailAttendeesDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  onSuccess,
}: EmailAttendeesDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const subj = subject.trim();
    const b = body.trim();
    if (!subj || !b) {
      toast.error("Subject and message are required");
      return;
    }
    try {
      setSending(true);
      const { recipientsSent } = await apiService.emailEventAttendees(eventId, { subject: subj, body: b });
      toast.success(`Email sent to ${recipientsSent} attendee(s).`);
      setSubject("");
      setBody("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to send email";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Email attendees</DialogTitle>
          </div>
          <DialogDescription>
            Send an email to all ticket holders for &quot;{eventName}&quot;. Pro and Enterprise feature.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="e.g. Important update about your event"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              placeholder="Write your message to attendees..."
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-gradient-to-r from-primary to-orange-500 text-white">
            {sending ? "Sending…" : "Send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
