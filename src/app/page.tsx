'use client';

import {useState, useEffect, useRef} from 'react';
import {useSession, signIn, signOut} from 'next-auth/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardHeader, CardContent} from '@/components/ui/card';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Avatar, AvatarImage, AvatarFallback} from '@/components/ui/avatar';
import {generateResponse} from '@/ai/flows/generate-response';
import {cn} from '@/lib/utils';
import {useToast} from '@/hooks/use-toast';
import {Toaster} from '@/components/ui/toaster';
import {Skeleton} from '@/components/ui/skeleton';
import {ProjectManager} from '@/components/project-manager';
import {Cog, Info} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Wrapper component to ensure hooks are used within client boundary
function ClientWrapper() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<
    {
      role: 'user' | 'assistant';
      content: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [userProject, setUserProject] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const {data: session, status, update: updateSession} = useSession();

  useEffect(() => {
    console.log('ClientWrapper component mounted');
    return () => {
      console.log('ClientWrapper component unmounted');
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Check if token is about to expire and refresh if needed
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout;
    
    if (accessToken && tokenExpiry) {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = tokenExpiry - currentTime;
      
      // If token expires in less than 5 minutes (300 seconds), refresh it
      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        console.log(`Token expires in ${timeUntilExpiry} seconds. Refreshing...`);
        refreshToken();
      } else if (timeUntilExpiry > 0) {
        // Set a timeout to refresh the token 5 minutes before it expires
        const refreshTime = (timeUntilExpiry - 300) * 1000;
        console.log(`Setting token refresh in ${refreshTime}ms`);
        
        refreshTimeout = setTimeout(() => {
          console.log('Token refresh timeout triggered');
          refreshToken();
        }, refreshTime);
      }
    }
    
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [accessToken, tokenExpiry]);

  useEffect(() => {
    console.log(`Authentication status changed: ${status}`);
    if (status === 'authenticated') {
      if (session?.accessToken) {
        console.log(`Access token found in session: ${session.accessToken}`);
        setAccessToken(session.accessToken as string);
        
        // Set token expiry if available
        if (session.expiresAt) {
          setTokenExpiry(session.expiresAt as number);
          console.log(`Token expires at: ${new Date((session.expiresAt as number) * 1000).toLocaleString()}`);
        }
      } else {
        console.warn('Access token missing from session.');
        toast({
          title: 'Warning',
          description: 'Access token missing from session. Some features may be unavailable.',
          variant: 'warning', // Changed from destructive for clarity
        });
        setAccessToken(null); // Ensure accessToken state is cleared
      }
    } else if (status === 'unauthenticated') {
      console.log('User is not authenticated.');
      setAccessToken(null); // Clear access token on unauthentication
      setTokenExpiry(null);
    } else if (status === 'loading') {
      console.log('Session loading...');
      // Optionally handle loading state, e.g., show a global loader
    }
  }, [session, status, toast]);

  // Function to refresh the access token
  const refreshToken = async () => {
    try {
      console.log('Refreshing access token...');
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to refresh token');
      }
      
      console.log('Token refreshed successfully');
      
      // Update the session with the new token
      setAccessToken(data.accessToken);
      setTokenExpiry(data.expiresAt);
      
      // Also update the session context
      await updateSession({
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
      });
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      toast({
        title: 'Session Error',
        description: 'Your session has expired. Please sign in again.',
        variant: 'destructive',
      });
      
      // Force sign out if token refresh fails
      signOut();
    }
  };

  const handleProjectChange = (projectId: string | null) => {
    console.log(`Project ID changed to: ${projectId}`);
    setUserProject(projectId);
    
    if (projectId) {
      toast({
        title: 'Project Linked',
        description: `Using Google Cloud Project: ${projectId}`,
        variant: 'default',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return; // Prevent submission if empty or already loading

    const userMessage = {role: 'user' as const, content: prompt};
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const currentPrompt = prompt; // Store prompt before clearing
    setPrompt('');
    setLoading(true);

    try {
      // Check if token is expired and refresh if needed
      if (tokenExpiry && Math.floor(Date.now() / 1000) > tokenExpiry - 60) {
        console.log('Token expired or about to expire, refreshing before API call');
        await refreshToken();
      }
      
      console.log(`Submitting prompt: "${currentPrompt}" with accessToken: ${accessToken ? 'present' : 'absent'} and userProject: ${userProject}`);
      const response = await generateResponse({
        prompt: currentPrompt, // Use stored prompt
        accessToken: accessToken ?? undefined,
        userProject: userProject ?? undefined,
      });
      console.log(`Gemini API response received: ${JSON.stringify(response)}`);
      const aiMessage = {role: 'assistant' as const, content: response.response};
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to generate response due to an unknown error';
      console.error('Gemini API Error:', error.stack || error); // Log stack trace if available
      
      // Handle token expiration errors
      if (errorMessage.includes('token') && errorMessage.includes('expired')) {
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Refreshing authentication...',
          variant: 'warning',
        });
        
        try {
          await refreshToken();
          toast({
            title: 'Session Refreshed',
            description: 'Your session has been refreshed. Please try again.',
            variant: 'default',
          });
        } catch (refreshError) {
          // Handle refresh failure - already logged in refreshToken()
        }
      }
      // Handle project-specific errors
      else if (errorMessage.includes('project') || errorMessage.includes('billing') || 
          errorMessage.includes('quota') || errorMessage.includes('permission')) {
        toast({
          title: 'Project Configuration Error',
          description: `${errorMessage}. Please check your Google Cloud Project settings.`,
          variant: 'destructive',
        });
        
        // Show project settings if project-related error
        setShowSettings(true);
      } else {
        toast({
          title: 'Error Generating Response',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      // Add an error message to the chat
      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'assistant', content: `Sorry, I couldn't get a response. Error: ${errorMessage}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

 const handleSignIn = async () => {
    console.log('[handleSignIn] Initiating sign-in process...');
    try {
      console.log('[handleSignIn] Calling next-auth signIn with Google provider.');
      // Ensure callbackUrl is correctly set to the current page URL
      const callbackUrl = window.location.href;
      console.log(`[handleSignIn] Using callbackUrl: ${callbackUrl}`);

      const result = await signIn('google', { callbackUrl }); // Pass callbackUrl here

      console.log(`[handleSignIn] signIn call completed. Result:`, JSON.stringify(result, null, 2));

      // Check the result object for errors or success indicators
      if (result?.error) {
        console.error(`[handleSignIn] Sign-in failed with error: ${result.error}`);
        toast({
          title: 'Sign-in Failed',
          description: `Could not sign in. Provider error: ${result.error}`,
          variant: 'destructive',
        });
      } else if (!result || result.ok === false) {
        // Handle cases where result is null/undefined or ok is false without a specific error message
        console.error('[handleSignIn] Sign-in failed. Result:', result);
        toast({
          title: 'Sign-in Failed',
          description: 'Sign-in attempt was not successful. Please try again.',
          variant: 'destructive',
        });
      } else {
        // Sign-in process initiated, NextAuth will handle the redirect or session update
        console.log('[handleSignIn] Sign-in initiated successfully. NextAuth will handle the rest.');
        // No automatic redirect here, let NextAuth handle it based on callbackUrl
        // if (result.url) {
        //   console.log(`[handleSignIn] Redirecting to: ${result.url}`);
        //   window.location.assign(result.url);
        // } else {
        //   console.log('[handleSignIn] Sign-in successful, no redirect URL provided by signIn result.');
        // }
      }
    } catch (error: any) {
      // Catch unexpected errors during the signIn call itself
      console.error('[handleSignIn] Unexpected error during sign-in process:', error.stack || error);
      toast({
        title: 'Sign-in Error',
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}. Please check console for details.`,
        variant: 'destructive',
      });
    } finally {
      console.log('[handleSignIn] Sign-in process function finished.');
    }
  };


  return (
    <div className="flex flex-col h-screen bg-background">
      <Toaster />
      <header className="bg-secondary p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Gemini Gateway</h1>
        <div className="flex items-center gap-2">
          {status === 'authenticated' && (
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Cog className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 space-y-4">
                  <ProjectManager onProjectChange={handleProjectChange} />
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {status === 'loading' ? (
            <Skeleton className="h-9 w-24 rounded-md" /> // Match button size
          ) : status === 'authenticated' ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8"> {/* Slightly smaller avatar */}
                <AvatarImage src={session?.user?.image ?? undefined} alt="User Avatar" />
                <AvatarFallback>{(session?.user?.name as string)?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{session?.user?.name || 'User'}</span> {/* Hide name on small screens */}
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          ) : (
            <Button onClick={handleSignIn} data-testid="sign-in-button"> {/* Added data-testid */}
              Sign In with Google
            </Button>
          )}
        </div>
      </header>
      <main className="flex-grow p-4 overflow-hidden flex">
        <Card className="h-full flex flex-col flex-grow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chat</h2>
              {userProject ? (
                <div className="flex items-center">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Using project: {userProject.substring(0, 12)}{userProject.length > 12 ? '...' : ''}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                        <Info className="h-3 w-3" />
                        <span className="sr-only">Info</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-80">
                      <div className="space-y-2">
                        <h3 className="font-medium">Using Your Google Cloud Project</h3>
                        <p className="text-sm">
                          API requests are being made using your Google Cloud Project.
                          You are responsible for any usage costs incurred.
                        </p>
                        <p className="text-sm">
                          Full Project ID: <code className="bg-slate-100 px-1 py-0.5 rounded">{userProject}</code>
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : status === 'authenticated' ? (
                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                  Link Project
                </Button>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {status === 'authenticated' ? `Chatting as ${session?.user?.name}` : 'Sign in to start chatting'}
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
            <ScrollArea className="flex-grow mb-4 pr-4 -mr-4"> {/* Added padding for scrollbar */}
              <div className="space-y-4" ref={chatContainerRef}>
                {messages.length === 0 && status === 'authenticated' && (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <div className="text-center p-6 bg-slate-50 rounded-lg max-w-md">
                      <h3 className="font-medium mb-2">Welcome to Gemini Gateway!</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Start chatting with Gemini AI using your own Google Cloud Project.
                        {!userProject && (
                          <span className="block mt-2 text-amber-600">
                            No project linked yet. Click "Link Project" to use your own quota.
                          </span>
                        )}
                      </p>
                      {!userProject && (
                        <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                          Link Your Project
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg max-w-[80%] break-words', // Added break-words
                      message.role === 'user'
                        ? 'bg-accent text-accent-foreground ml-auto' // Use ml-auto for user
                        : 'bg-secondary text-secondary-foreground mr-auto' // Use mr-auto for assistant
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                {loading && (
                   <div className="p-3 rounded-lg bg-muted text-muted-foreground mr-auto max-w-[80%]"> {/* Match assistant style */}
                     <Skeleton className="h-4 w-10 mb-2" />
                     <Skeleton className="h-4 w-full mb-1" />
                     <Skeleton className="h-4 w-5/6" />
                   </div>
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleSubmit} className="mt-auto flex items-center space-x-2 border-t pt-4">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={status === 'authenticated' ? "Type your message here..." : "Please sign in to chat"}
                className="flex-grow resize-none" // Prevent manual resize
                rows={1} // Start with one row, auto-expands with Shadcn style
                disabled={status !== 'authenticated' || loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent newline on Enter
                    handleSubmit(e); // Submit form
                  }
                }}
              />
              <Button 
                type="submit" 
                disabled={status !== 'authenticated' || loading || !prompt.trim()}
                title={!userProject && status === 'authenticated' ? "Consider linking your Google Cloud Project first" : undefined}
              >
                {loading ? '...' : 'Send'} {/* Show ellipsis when loading */}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
       {/* Debugging Section - Conditionally render session details */}
       {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 text-white p-4 mt-4 rounded-md text-xs overflow-auto max-h-40"> {/* Darker theme, smaller text */}
          <h3 className="text-sm font-semibold mb-2">Session Details (Debug)</h3>
          <pre><code>{JSON.stringify({ 
            status, 
            session, 
            userProject, 
            tokenInfo: {
              accessToken: accessToken ? '[PRESENT]' : '[MISSING]',
              expiresAt: tokenExpiry ? new Date(tokenExpiry * 1000).toLocaleString() : 'unknown'
            }
          }, null, 2)}</code></pre>
        </div>
      )}
    </div>
  );
}

// Export the main component
export default function Home() {
  return <ClientWrapper />;
}