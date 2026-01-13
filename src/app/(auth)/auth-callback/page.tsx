import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen } from "lucide-react";

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full animate-pulse">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
