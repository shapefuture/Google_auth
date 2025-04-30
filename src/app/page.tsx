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
  const [userProject, setUserProject] = useState<string | null>(null); // Assuming userProject might be needed later
  const {data: session, status} = useSession();

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

  useEffect(() => {
    console.log(`Authentication status changed: ${status}`);
    if (status === 'authenticated') {
      if (session?.accessToken) {
        console.log(`Access token found in session: ${session.accessToken}`);
        setAccessToken(session.accessToken as string);
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
    } else if (status === 'loading') {
      console.log('Session loading...');
      // Optionally handle loading state, e.g., show a global loader
    }
  }, [session, status, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return; // Prevent submission if empty or already loading

    const userMessage = {role: 'user' as const, content: prompt};
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const currentPrompt = prompt; // Store prompt before clearing
    setPrompt('');
    setLoading(true);

    try {
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
      toast({
        title: 'Error Generating Response',
        description: errorMessage,
        variant: 'destructive',
      });
      // Optionally add the failed user message back to the input
      // setPrompt(currentPrompt);
      // Or add an error message to the chat
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
      </header>
      <main className="flex-grow p-4 overflow-hidden flex">
        <Card className="h-full flex flex-col flex-grow">
          <CardHeader>
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-sm text-muted-foreground">
              {status === 'authenticated' ? `Chatting as ${session?.user?.name}` : 'Sign in to start chatting'}
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
            <ScrollArea className="flex-grow mb-4 pr-4 -mr-4"> {/* Added padding for scrollbar */}
              <div className="space-y-4" ref={chatContainerRef}>
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
              <Button type="submit" disabled={status !== 'authenticated' || loading || !prompt.trim()}>
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
          <pre><code>{JSON.stringify({ status, session }, null, 2)}</code></pre>
        </div>
      )}
    </div>
  );
}

// Export the main component
export default function Home() {
  return <ClientWrapper />;
}
