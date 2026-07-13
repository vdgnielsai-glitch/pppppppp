import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SGLogo } from "@/components/SGLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

const emailSchema = z.string().trim().email("Geldig e-mailadres vereist").max(255);
const passwordSchema = z.string().min(1, "Wachtwoord vereist").max(72);

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const { session } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate(redirect, { replace: true });
  }, [session, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) return toast.error(emailParsed.error.issues[0].message);
    const pwParsed = passwordSchema.safeParse(password);
    if (!pwParsed.success) return toast.error(pwParsed.error.issues[0].message);

    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: pwParsed.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name.trim() || undefined },
          },
        });
        if (error) throw error;
        toast.success("Account aangemaakt", { description: "Je bent nu ingelogd." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: pwParsed.data,
        });
        if (error) throw error;
      }
      navigate(redirect, { replace: true });
    } catch (err) {
      toast.error("Auth mislukt", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Google login mislukt", { description: (result.error as Error).message });
      return;
    }
    if (result.redirected) return;
    navigate(redirect, { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-card font-sans text-card-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-safe pt-safe">
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex items-center gap-4 pl-2">
            <SGLogo size={62} className="drop-shadow-[0_5px_14px_hsl(var(--primary)/0.35)]" />
            <div>
              <h1 className="text-3xl font-extrabold leading-none tracking-normal text-card-foreground">
                Shop&Go
              </h1>
              <p className="mt-1 text-[17px] text-muted-foreground">Kortrijk parkeer-reminder</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-deep bg-card px-6 py-6 shadow-elevated">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-deep p-1 text-white/62">
                <TabsTrigger value="signin" className="h-9 rounded-lg text-[15px] font-bold data-[state=active]:bg-background data-[state=active]:text-white data-[state=active]:shadow-none">Inloggen</TabsTrigger>
                <TabsTrigger value="signup" className="h-9 rounded-lg text-[15px] font-bold data-[state=active]:bg-background data-[state=active]:text-white data-[state=active]:shadow-none">Registreren</TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-7">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {tab === "signup" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-muted-foreground">Naam (optioneel)</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Janssens" maxLength={80} className="h-[52px] rounded-xl border-deep bg-deep px-4 text-[18px] text-white placeholder:text-white/58" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-muted-foreground">E-mail</Label>
                    <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jij@voorbeeld.be" required className="h-[52px] rounded-xl border-deep bg-deep px-4 text-[18px] text-white placeholder:text-white/58" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-muted-foreground">Wachtwoord</Label>
                    <Input id="password" type="password" autoComplete={tab === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kies een wachtwoord" required className="h-[52px] rounded-xl border-deep bg-deep px-4 text-[18px] text-white placeholder:text-white/58" />
                  </div>
                  <Button type="submit" className="h-[52px] w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-glow-mint hover:bg-primary/90" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {tab === "signup" ? "Account aanmaken" : "Inloggen"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-deep" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">of</span>
              <div className="h-px flex-1 bg-deep" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={loading}
              className="h-[52px] w-full rounded-xl border-2 border-deep bg-deep text-[15px] font-extrabold text-white hover:bg-background"
            >
              <GoogleIcon className="mr-2 h-5 w-5" />
              Inloggen met Google
            </Button>
          </div>

          <div className="mt-6 space-y-3 text-center">
            <Link
              to="/"
              className="inline-block text-[17px] font-extrabold text-primary underline-offset-4 hover:underline"
            >
              Doorgaan zonder account →
            </Link>
            <p className="px-2 text-[13px] leading-relaxed text-muted-foreground">
              Een account is alleen nodig voor sync &amp; back-up. Timer, locatie, notitie en foto werken
              ook zonder account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-2H12z"/>
  </svg>
);

export default Auth;
