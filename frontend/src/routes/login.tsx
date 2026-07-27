import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, GraduationCap, Sparkles, Trophy, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type UserRole } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LumenLMS" },
      {
        name: "description",
        content: "Sign in to your LumenLMS account to access courses, quizzes, and certificates.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await login(email, password, role, remember);
      toast.success("Welcome back!", { description: `Signed in as ${role}.` });
      navigate({ to: "/dashboard", replace: true });
    } catch (requestError) {
      setErr(
        requestError instanceof Error ? requestError.message : "Sign in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: hero illustration */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-hero text-primary-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px, 90px 90px",
          }}
        />
        <div className="relative z-10 flex items-center gap-2">
          <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">LumenLMS</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest bg-white/15 backdrop-blur rounded-full px-3 py-1">
              <Sparkles className="h-3 w-3" /> Enterprise-grade LMS
            </span>
            <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight">
              Learning that <br />
              <span className="italic font-serif">actually</span> lands.
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 max-w-md">
              Build courses, run quizzes, issue certificates, and track outcomes — one polished
              workspace for schools, teams, and instructors.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg">
            {[
              { icon: BookOpen, k: "Learn", l: "Video courses" },
              { icon: Users, k: "Connect", l: "Discussions" },
              { icon: Trophy, k: "Achieve", l: "Certificates" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-4"
              >
                <s.icon className="h-5 w-5 mb-2" />
                <div className="text-lg font-bold">{s.k}</div>
                <div className="text-xs text-primary-foreground/70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-primary-foreground/70">
          "LumenLMS reduced our course launch time by 60%." —{" "}
          <span className="font-medium text-primary-foreground">Sasha K., L&D Lead</span>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Lumen<span className="text-gradient">LMS</span>
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to continue your learning journey.
          </p>

          <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)} className="mt-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(!!v)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me for 30 days
              </Label>
            </div>

            {err && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm px-3 py-2">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 bg-gradient-primary shadow-glow hover:opacity-95"
            >
              {busy ? "Signing in…" : `Sign in as ${role}`}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Need an account? Contact your administrator.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
