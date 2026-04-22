"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthForm() {
  const router = useRouter();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerInfo, setRegisterInfo] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setLoginLoading(false);
    if (error) {
      setLoginError(error.message);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError(null);
    setRegisterInfo(null);
    if (registerPassword !== registerConfirm) {
      setRegisterError("Passwords do not match.");
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }
    setRegisterLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: registerEmail.trim(),
      password: registerPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });
    setRegisterLoading(false);
    if (error) {
      setRegisterError(error.message);
      return;
    }
    if (data.session) {
      router.push("/home");
      router.refresh();
      return;
    }
    setRegisterInfo(
      "Check your email for a confirmation link to finish signing up."
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image
          src="/logo.png"
          alt="Inex Tracker"
          width={200}
          height={120}
          className="h-auto w-48 object-contain"
          priority
        />
        <p className="text-muted-foreground text-sm">
          Income &amp; expense tracking
        </p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full gap-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="flex flex-col gap-4">
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                </div>
                {loginError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {loginError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register" className="flex flex-col gap-4">
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    disabled={registerLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    disabled={registerLoading}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm">Confirm password</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                    required
                    disabled={registerLoading}
                    minLength={6}
                  />
                </div>
                {registerError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {registerError}
                  </p>
                ) : null}
                {registerInfo ? (
                  <p className="text-muted-foreground text-sm" role="status">
                    {registerInfo}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={registerLoading}
                >
                  {registerLoading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
