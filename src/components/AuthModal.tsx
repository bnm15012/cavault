import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapNewUser, getUserRoles } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, { message: "Enter your name" }).max(100),
  firmName: z.string().trim().min(2, { message: "Enter your firm name" }).max(120),
});

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which tab to show first */
  defaultTab?: "login" | "signup";
}

export function AuthModal({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function redirectAfterLogin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const roles = await getUserRoles({ data: { userId: user.id } });
    onOpenChange(false);
    if (roles.includes("client")) {
      navigate({ to: "/portal" });
    } else {
      navigate({ to: "/dashboard" });
    }
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Incorrect email or password" : error.message);
      return;
    }
    await redirectAfterLogin();
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      fullName: form.get("fullName"),
      firmName: form.get("firmName"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: parsed.data.fullName, firm_name: parsed.data.firmName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "This email is already registered. Try signing in instead."
          : error.message,
      );
      return;
    }
    if (data.session && data.user) {
      try {
        await bootstrapNewUser({
          data: {
            userId: data.user.id,
            email: data.user.email ?? parsed.data.email,
            fullName: parsed.data.fullName,
            firmName: parsed.data.firmName,
          },
        });
      } catch (err) {
        console.error("Failed to bootstrap new user in MySQL:", err);
        toast.error("Account created but workspace setup failed. Please contact support.");
        return;
      }
      toast.success("Welcome! Your firm workspace is ready.");
      onOpenChange(false);
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Check your email to confirm your account, then sign in.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400">
              <Landmark className="h-4 w-4 text-slate-900" />
            </span>
            <span className="font-display text-lg font-semibold">PracticeVault</span>
          </div>
          <DialogTitle className="font-display text-xl">Welcome</DialogTitle>
          <DialogDescription>
            Sign in to your workspace, or register your CA firm for a 7-day free trial.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Register firm</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <Button type="submit" className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Your full name</Label>
                <Input id="signup-name" name="fullName" autoComplete="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-firm">Firm name</Label>
                <Input id="signup-firm" name="firmName" placeholder="e.g. Sharma & Associates" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" name="password" type="password" autoComplete="new-password" required />
              </div>
              <Button type="submit" className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating workspace…</> : "Create firm workspace"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          Team members and clients: use the login your firm shared with you.
        </p>
      </DialogContent>
    </Dialog>
  );
}
