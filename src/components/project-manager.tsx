'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ProjectSettingsModal } from '@/components/ui/project-settings-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUserProjectId, storeUserProjectId } from '@/lib/project-utils';
import { useToast } from '@/hooks/use-toast';
import { Settings, Cloud, Zap, Shield } from 'lucide-react';

export function ProjectManager({ onProjectChange }: { onProjectChange: (projectId: string | null) => void }) {
  const { data: session } = useSession();
  const [userProject, setUserProject] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserProject() {
      if (session?.user?.id) {
        setIsLoading(true);
        try {
          // Load from localStorage first (for immediate feedback)
          const localProject = localStorage.getItem(`project-${session.user.id}`);
          if (localProject) {
            setUserProject(localProject);
            onProjectChange(localProject);
          }

          // Then try to load from server (in a real implementation)
          const serverProject = await getUserProjectId(session.user.id as string);
          if (serverProject && serverProject !== localProject) {
            setUserProject(serverProject);
            onProjectChange(serverProject);
            // Update localStorage
            localStorage.setItem(`project-${session.user.id}`, serverProject);
          }
        } catch (error) {
          console.error('Failed to load user project:', error);
          toast({
            title: 'Error loading project settings',
            description: 'Could not retrieve your project settings. Please try again later.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadUserProject();
  }, [session, onProjectChange, toast]);

  const handleProjectChange = (projectId: string | null) => {
    if (session?.user?.id) {
      setUserProject(projectId);
      onProjectChange(projectId);
      
      // Store in localStorage for immediate feedback
      if (projectId) {
        localStorage.setItem(`project-${session.user.id}`, projectId);
      } else {
        localStorage.removeItem(`project-${session.user.id}`);
      }
      
      // Store on server (in a real implementation)
      storeUserProjectId(session.user.id as string, projectId);
    }
    
    setIsModalOpen(false);
  };

  if (!session) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">AI Access Settings</CardTitle>
          {userProject ? (
            <Badge variant="outline" className="text-xs">
              {userProject}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-green-50 text-blue-700">
              <Zap className="h-3 w-3 mr-1 text-yellow-500" />
              Free Tier
            </Badge>
          )}
        </div>
        <CardDescription>
          {userProject 
            ? "Using your Google Cloud Project for Gemini API access" 
            : "You're currently using Gemini Gateway's free tier access"}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm pb-3">
        {isLoading ? (
          <p>Loading your access settings...</p>
        ) : userProject ? (
          <div className="space-y-2">
            <p>
              API requests are attributed to your project. You can monitor usage and billing in the{' '}
              <a 
                href={`https://console.cloud.google.com/apis/dashboard?project=${userProject}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>.
            </p>
            <p className="text-xs text-green-700">
              ✅ Higher API quotas and rate limits
            </p>
            <div className="flex items-center bg-blue-50 p-2 rounded text-xs text-blue-700 mt-2">
              <Shield className="h-3 w-3 mr-2 flex-shrink-0" />
              <span>You can switch back to the free tier at any time</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-2 rounded text-blue-700 text-xs">
              <div className="flex items-center font-medium mb-1">
                <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                Free Tier Benefits
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>No API key required</li>
                <li>Instant access to Gemini AI</li>
                <li>No setup or configuration needed</li>
              </ul>
            </div>
            
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Free tier has usage limits and shared quota
            </p>
            
            <p className="text-xs mt-2">
              For higher quotas and dedicated access, link your own Google Cloud Project.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => setIsModalOpen(true)}
        >
          <Settings className="w-4 h-4 mr-2" />
          {userProject ? "Manage Project Settings" : "Manage AI Access"}
        </Button>
      </CardFooter>

      <ProjectSettingsModal
        userProject={userProject}
        setUserProject={handleProjectChange}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </Card>
  );
}