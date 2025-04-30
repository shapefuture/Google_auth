'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateProjectId } from '@/lib/project-utils';
import { useToast } from '@/hooks/use-toast';

interface ProjectSettingsModalProps {
  userProject: string | null;
  setUserProject: (projectId: string | null) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectSettingsModal({
  userProject,
  setUserProject,
  open,
  onOpenChange,
}: ProjectSettingsModalProps) {
  const [projectId, setProjectId] = useState(userProject || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    details?: string[];
  } | null>(null);
  const { toast } = useToast();

  const handleValidateProject = async () => {
    if (!projectId.trim()) {
      setValidationResult({
        valid: false,
        message: 'Project ID cannot be empty',
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateProjectId(projectId);
      setValidationResult(result);
      
      if (result.valid) {
        setUserProject(projectId);
        toast({
          title: 'Project linked successfully',
          description: 'Your Google Cloud Project has been linked to your account.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      setValidationResult({
        valid: false,
        message: 'Validation failed',
        details: [error.message || 'An unexpected error occurred'],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const clearProject = () => {
    setUserProject(null);
    setProjectId('');
    setValidationResult(null);
    toast({
      title: 'Project unlinked',
      description: 'Your Google Cloud Project has been unlinked from your account.',
      variant: 'default',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {userProject ? 'Manage Project' : 'Link Google Cloud Project'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Google Cloud Project Settings</DialogTitle>
          <DialogDescription>
            Link your Google Cloud Project to use the Gemini API with your own quota and billing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {userProject && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Project Linked</AlertTitle>
              <AlertDescription>
                Currently using project: <span className="font-mono font-semibold">{userProject}</span>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="project-id">Google Cloud Project ID</Label>
            <Input
              id="project-id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="my-project-123456"
            />
            <p className="text-xs text-muted-foreground">
              Find your Project ID in the Google Cloud Console dashboard.
            </p>
          </div>

          {validationResult && (
            <Alert variant={validationResult.valid ? 'default' : 'destructive'} className={cn(
              validationResult.valid ? 'bg-green-50 text-green-800 border-green-200' : ''
            )}>
              {validationResult.valid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{validationResult.valid ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{validationResult.message}</p>
                {validationResult.details && (
                  <ul className="list-disc pl-5 text-sm">
                    {validationResult.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>How to set up your project</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal pl-5 text-sm space-y-1">
                <li>Create a Google Cloud Project at <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.cloud.google.com</a></li>
                <li>Enable billing for your project</li>
                <li>Enable the <span className="font-semibold">Generative Language API</span></li>
                <li>Copy your Project ID and paste it here</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {userProject && (
            <Button variant="outline" type="button" onClick={clearProject} className="sm:mr-auto">
              Unlink Project
            </Button>
          )}
          <Button type="button" onClick={handleValidateProject} disabled={isValidating}>
            {isValidating ? 'Validating...' : 'Validate & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}