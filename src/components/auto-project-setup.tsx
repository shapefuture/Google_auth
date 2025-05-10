'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, Tool, Cloud, Database, Zap } from 'lucide-react';

interface SetupProgress {
  status: 'pending' | 'creating' | 'billing' | 'api' | 'complete' | 'failed';
  message: string;
  projectId?: string;
  error?: string;
}

export function AutoProjectSetup({ onComplete }: { onComplete: (projectId: string | null) => void }) {
  const { data: session } = useSession();
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [setupStarted, setSetupStarted] = useState(false);
  const [autoSetupEnabled, setAutoSetupEnabled] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Start setup process when component mounts if auto setup is enabled
  useEffect(() => {
    if (session?.user?.id && autoSetupEnabled && !setupStarted) {
      startSetup();
    }
  }, [session, autoSetupEnabled, setupStarted]);

  // Poll for progress updates when setup is in progress
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (setupStarted && progress && progress.status !== 'complete' && progress.status !== 'failed') {
      interval = setInterval(checkProgress, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [setupStarted, progress]);

  // Start the project setup process
  const startSetup = async () => {
    if (!session?.user?.id) {
      toast({
        title: 'Error',
        description: 'You must be signed in to set up a Google Cloud Project',
        variant: 'destructive',
      });
      return;
    }

    setSetupStarted(true);
    setProgress({
      status: 'pending',
      message: 'Starting Google Cloud Project setup...'
    });

    try {
      const response = await fetch('/api/cloud/setup-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to start project setup');
      }

      // Immediate first check
      checkProgress();
    } catch (error: any) {
      console.error('Error starting project setup:', error);
      setProgress({
        status: 'failed',
        message: 'Failed to start project setup',
        error: error.message || 'Unknown error'
      });
      
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to start Google Cloud Project setup',
        variant: 'destructive',
      });
    }
  };

  // Check the current progress of setup
  const checkProgress = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/cloud/setup-project');
      
      if (response.status === 404) {
        // No setup in progress (likely cleanup or first check)
        return;
      }
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to check setup progress');
      }

      const data = await response.json();
      setProgress(data);

      // Handle completion
      if (data.status === 'complete' && data.projectId) {
        toast({
          title: 'Setup Complete',
          description: `Your Google Cloud Project has been set up: ${data.projectId}`,
          variant: 'default',
        });
        
        // Notify parent component
        onComplete(data.projectId);
      }
      
      // Handle failure
      if (data.status === 'failed') {
        toast({
          title: 'Setup Failed',
          description: data.error || 'Failed to set up Google Cloud Project',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error checking project setup progress:', error);
      // Don't update progress here to avoid overriding visible progress
    }
  };

  // Skip automatic setup
  const skipSetup = () => {
    setAutoSetupEnabled(false);
    setSetupStarted(false);
    setProgress(null);
    onComplete(null);
    
    toast({
      title: 'Using Free Tier',
      description: 'You can set up your Google Cloud Project later from the Settings menu',
      variant: 'default',
    });
  };

  // Retry setup after failure
  const retrySetup = () => {
    setProgress(null);
    setSetupStarted(false);
    startSetup();
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    switch (progress?.status) {
      case 'pending': return 10;
      case 'creating': return 30;
      case 'billing': return 60;
      case 'api': return 80;
      case 'complete': return 100;
      case 'failed': return 100;
      default: return 0;
    }
  };

  // Get the appropriate icon for current status
  const getStatusIcon = () => {
    switch (progress?.status) {
      case 'pending': return <Loader2 className="h-5 w-5 animate-spin text-amber-500" />;
      case 'creating': return <Cloud className="h-5 w-5 text-blue-500" />;
      case 'billing': return <Database className="h-5 w-5 text-purple-500" />;
      case 'api': return <Tool className="h-5 w-5 text-blue-500" />;
      case 'complete': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Zap className="h-5 w-5 text-amber-500" />;
    }
  };

  if (!session) return null;
  if (!autoSetupEnabled) return null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Google Cloud Setup</CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">
              {progress?.status === 'complete' ? 'Complete' : 
               progress?.status === 'failed' ? 'Failed' : 
               'In Progress...'}
            </span>
          </div>
        </div>
        <CardDescription>
          Setting up your personal Google Cloud Project for enhanced Gemini API access
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!setupStarted && (
          <Alert>
            <AlertTitle>Automatic Setup</AlertTitle>
            <AlertDescription>
              We'll automatically set up a Google Cloud Project for you with all necessary configurations.
              This gives you higher quotas and dedicated access to the Gemini API.
            </AlertDescription>
          </Alert>
        )}
        
        {progress && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.message}</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
            
            {progress.status === 'complete' && progress.projectId && (
              <Alert variant="success" className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Setup Complete</AlertTitle>
                <AlertDescription>
                  Your project <span className="font-mono font-semibold">{progress.projectId}</span> is ready to use.
                  All API requests will now use your dedicated project.
                </AlertDescription>
              </Alert>
            )}
            
            {progress.status === 'failed' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Setup Failed</AlertTitle>
                <AlertDescription>
                  {progress.error || 'Failed to set up Google Cloud Project. You can try again or use the free tier.'}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {progress?.status !== 'complete' && progress?.status !== 'failed' && (
          <Button 
            variant="outline" 
            onClick={skipSetup}
          >
            Skip & Use Free Tier
          </Button>
        )}
        
        {progress?.status === 'failed' && (
          <>
            <Button 
              variant="outline" 
              onClick={skipSetup}
            >
              Use Free Tier
            </Button>
            <Button 
              onClick={retrySetup}
            >
              Retry Setup
            </Button>
          </>
        )}
        
        {progress?.status === 'complete' && (
          <Button 
            className="w-full"
            onClick={() => router.refresh()}
          >
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}