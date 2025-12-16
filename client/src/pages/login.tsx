import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ServerCrash, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

// Simple demo credentials (client-side validation only).
// In a real app this should be validated server-side.
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useStore();

  const [username, setUsername] = useState(DEMO_USERNAME);
  const [password, setPassword] = useState("");

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic client-side validation
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setIsLoading(true);

    // Mock server-side credential check (replace with real API call as needed)
    setTimeout(() => {
      if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
        login(); // Update store state
        toast.success("Welcome back, Administrator");
        setLocation("/");
      } else {
        toast.error("Invalid username or password");
      }
      setIsLoading(false);
    }, 700);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <ServerCrash className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SlotManager Pro</h1>
          <p className="text-muted-foreground">Enter your credentials to access the admin panel.</p>
        </div>

        <Card className="shadow-xl border-muted/40">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Secure access for authorized personnel only.</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="admin"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full text-base py-5" disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          &copy; 2024 SlotManager Enterprise Systems. All rights reserved.
        </p>
      </div>
    </div>
  );
}
