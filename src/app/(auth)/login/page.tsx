"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  signInWithEmail,
  signInWithMagicLink,
} from "@/lib/supabase/auth";
import { BookOpen } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const email = watch("email");

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    const { error } = await signInWithEmail(data.email, data.password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard/");
  };

  const handleMagicLink = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address first");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error } = await signInWithMagicLink(email);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setIsLoading(false);
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>. Click the link
              in the email to sign in.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => setMagicLinkSent(false)}>
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Community Bible Study account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register("password")}
            />

            <div className="flex items-center justify-between">
              <Link
                href="/forgot-password/"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleMagicLink}
                disabled={isLoading}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Magic Link
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
