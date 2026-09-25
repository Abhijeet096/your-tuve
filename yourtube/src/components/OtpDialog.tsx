import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";

export default function OtpDialog() {
  const { otpchallenge, verifyotp, resendotp, cancelotp } = useUser();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (!otpchallenge) return;
    setCode("");
    setCooldown(30);
  }, [otpchallenge?.userId]);

  useEffect(() => {
    if (!otpchallenge || cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpchallenge, cooldown]);

  if (!otpchallenge) return null;

  const where = [otpchallenge.city, otpchallenge.state].filter(Boolean).join(", ");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      await verifyotp(code);
      toast.success("Verified, you're signed in");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Verification failed");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try {
      await resendotp();
      setCooldown(30);
      toast.success("A new code has been sent");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't resend the code");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && cancelotp()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center">Verify it's you</DialogTitle>
          <DialogDescription className="text-center">
            We noticed a sign-in from a new {otpchallenge.reason}
            {where ? ` (${where})` : ""}. Enter the 6-digit code we sent to{" "}
            <span className="font-medium">{otpchallenge.email}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            className="text-center text-2xl tracking-[0.5em] h-14"
          />
          <Button type="submit" className="w-full" disabled={code.length !== 6 || submitting}>
            {submitting ? "Verifying..." : "Verify"}
          </Button>
        </form>
        <div className="flex items-center justify-between text-sm">
          <button
            className="text-blue-600 disabled:text-gray-400"
            onClick={resend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <button className="text-gray-500" onClick={cancelotp}>
            Cancel sign-in
          </button>
        </div>
        {otpchallenge.previewUrl && (
          <a
            href={otpchallenge.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs text-gray-500 underline"
          >
            Dev mode: open test inbox
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
