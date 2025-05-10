'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Zap, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      const result = await signIn('google', {
        callbackUrl: decodeURI(callbackUrl),
        redirect: true,
      });
      
      if (result?.error) {
        toast({
          title: 'Authentication Error',
          description: 'Failed to sign in with Google. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Authentication Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Gemini Gateway</CardTitle>
          <CardDescription>
            Sign in to access Gemini AI using your Google account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Access Gemini AI in two ways:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Free tier access with our shared API key</li>
              <li>Connect your own Google Cloud Project for higher quotas</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full py-6 text-base"
            disabled={isLoading}
          >
            <LogIn className="h-5 w-5 mr-2" />
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col text-xs text-center text-gray-500 border-t pt-4">
          <p>Your Google account is used only for authentication</p>
          <p>No personal data is stored except what's needed for the service</p>
        </CardFooter>
      </Card>
    </div>
  );
}