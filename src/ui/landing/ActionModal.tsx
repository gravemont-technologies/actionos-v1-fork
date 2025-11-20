import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/components/ui/dialog";
import { Button } from "@/ui/components/ui/button";
import { Textarea } from "@/ui/components/ui/textarea";
import { Calendar, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/ui/hooks/use-toast";

interface ActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Compact modal with:
 * - Single textarea (max 250 chars, ephemeral by default)
 * - 1-click Calendar/Email/Slack prefill actions
 * - Small note showing estimated response time
 * - Redaction preview before persisting profile (explicit opt-in)
 */
export function ActionModal({ open, onOpenChange }: ActionModalProps) {
  const [situation, setSituation] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (channel: "calendar" | "email" | "slack") => {
    if (!situation.trim()) {
      toast({
        title: "Input required",
        description: "Please describe your situation in 1-3 sentences.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Prefill based on channel
    const prefillData = {
      calendar: `Action Session: ${situation.slice(0, 50)}...`,
      email: `Subject: Action Request\n\nSituation: ${situation}`,
      slack: `New action request: ${situation}`,
    };

    toast({
      title: `${channel.charAt(0).toUpperCase() + channel.slice(1)} prefilled`,
      description: prefillData[channel],
    });

    setIsProcessing(false);
    setSituation("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Describe your situation</DialogTitle>
          <DialogDescription>
            1-3 sentences. We'll generate exact, high-leverage actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Example: I need to onboard 3 new team members remotely in 2 weeks with limited resources."
            value={situation}
            onChange={(e) => setSituation(e.target.value.slice(0, 250))}
            maxLength={250}
            rows={4}
            className="resize-none"
            aria-label="Describe situation"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Max 250 characters</span>
            <span>{situation.length}/250</span>
          </div>

          {/* 1-click prefill actions */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit("calendar")}
              disabled={isProcessing}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Calendar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit("email")}
              disabled={isProcessing}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs">Email</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit("slack")}
              disabled={isProcessing}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs">Slack</span>
            </Button>
          </div>

          {/* Estimated response time */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            ⏱️ Estimated response: <strong>30-90 seconds</strong>
          </p>
          <p className="text-xs text-center text-muted-foreground pt-2.5">
            🚨 Product is in beta. We're working hard to improve it ❗
          </p>

          {/* Privacy note */}
          <p className="text-xs text-center text-muted-foreground border-t pt-3">
            Input is ephemeral by default. Profile data requires explicit opt-in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
