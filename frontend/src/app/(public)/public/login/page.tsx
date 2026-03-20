import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LoginLogo } from "../../components/login/LoginLogo";
import { LoginForm } from "../../components/login/LoginForm";

export const metadata = {
  title: "Login | Gonza Systems",
  description: "Sign in to your account to continue",
};

export default function LoginPage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/lovable-uploads/2fca69a3-fd1f-4833-bb84-fd7f5764059f.png')`,
      }}>
      <div className="w-full max-w-md">
        <LoginLogo />
        <Card className="border-primary/10 shadow-lg bg-white/90">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-primary">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
