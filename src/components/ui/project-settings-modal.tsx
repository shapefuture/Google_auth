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
import { AlertCircle, CheckCircle, Info, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateProjectId } from '@/lib/project-utils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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
  const [activeTab, setActiveTab] = useState(userProject ? 'project' : 'free');

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
    setActiveTab('free');
    toast({
      title: 'Using Free Tier',
      description: 'Switched to Gemini Gateway\'s free tier access',
      variant: 'default',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {userProject ? 'Manage Project' : 'Manage AI Access'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Access Settings</DialogTitle>
          <DialogDescription>
            Choose between free tier access or using your own Google Cloud Project
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="free" className="relative">
              Free Tier
              {!userProject && (
                <div className="absolute -top-1 -right-1">
                  <Badge className="h-4 px-1 py-0 text-[10px] bg-green-100 text-green-800">Active</Badge>
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger value="project" className="relative">
              Your Project
              {userProject && (
                <div className="absolute -top-1 -right-1">
                  <Badge className="h-4 px-1 py-0 text-[10px] bg-green-100 text-green-800">Active</Badge>
                </div>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="free" className="space-y-4 py-4">
            <Alert variant="default" className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <Zap className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Free Tier Access</AlertTitle>
              <AlertDescription>
                Use Gemini AI with our shared API key - no configuration required
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Free Tier Features & Limitations</h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Instant access with no API key required</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>No billing or payment setup needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <span>Limited to 60 requests per hour</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <span>Shared quota among all free tier users</span>
                </li>
              </ul>
            </div>
            
            {userProject && (
              <Button
                variant="outline"
                onClick={clearProject}
                className="w-full"
              >
                Switch to Free Tier
              </Button>
            )}
          </TabsContent>
          
          <TabsContent value="project" className="space-y-4 py-4">
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
                Find your Project ID in the Google Cloud Console dashboard
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
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Your Project Benefits</h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Higher API rate limits and quota</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Full control over API usage and billing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Higher reliability during peak usage times</span>
                </li>
              </ul>
            </div>

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
            
            <div className="flex justify-between gap-2">
              {userProject && (
                <Button variant="outline" type="button" onClick={clearProject}>
                  Switch to Free Tier
                </Button>
              )}
              <Button 
                type="button" 
                onClick={handleValidateProject} 
                disabled={isValidating}
                className={userProject ? "" : "w-full"}
              >
                {isValidating ? 'Validating...' : userProject ? 'Update Project' : 'Validate & Save'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}