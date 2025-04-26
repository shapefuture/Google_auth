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

export default function Home() {
  return <ClientOnly />;
}

function ClientOnly() {
  const {toast} = useToast();
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
  const [userProject, setUserProject] = useState<string | null>(null);
  const {data: session, status} = useSession();

  useEffect(() => {
    console.log('ClientOnly component mounted');
    return () => {
      console.log('ClientOnly component unmounted');
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    console.log(`Authentication status: ${status}`);
    if (status === 'authenticated') {
      if (session?.accessToken) {
        console.log(`Access token found in session: ${session.accessToken}`);
        setAccessToken(session.accessToken as string);
      } else {
        console.warn('Access token missing from session.');
        toast({
          title: 'Warning',
          description: 'Access token missing from session. Some features may be unavailable.',
          variant: 'warning',
        });
      }
    } else if (status === 'unauthenticated') {
      console.log('User is not authenticated.');
      setAccessToken(null);
    } else if (status === 'loading') {
      console.log('Session loading...');
    }
  }, [session, status, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = {role: 'user' as const, content: prompt};
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      console.log(`Submitting prompt: ${prompt} with accessToken: ${accessToken} and userProject: ${userProject}`);
      const response = await generateResponse({
        prompt: prompt,
        accessToken: accessToken ?? undefined,
        userProject: userProject ?? undefined,
      });
      console.log(`Gemini API response: ${JSON.stringify(response)}`);
      const aiMessage = {role: 'assistant' as const, content: response.response};
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate response',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    console.log('Attempting sign in with Google');
    try {
      console.log('Signing in with Google provider...');
      const result = await signIn('google', {callbackUrl: window.location.href});
      console.log(`Sign in result: ${JSON.stringify(result, null, 2)}`); // Use stringify with spacing for better readability

      if (result?.error) {
        console.error('Sign-in error from provider:', result.error);
        toast({
          title: 'Sign-in failed',
          description: `Provider sign-in error: ${result.error}`,
          variant: 'destructive',
        });
      } else if (result?.status === 200) {
        console.log('Sign-in was successful based on status code.');
      } else {
        console.log('Sign-in completed without errors.');
      }

      // Enhanced logging to trace the OAuth flow
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed('OAuth Flow Details:');
        console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
        console.log('Callback URL:', window.location.href);
        console.groupEnd();
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      toast({
        title: 'Sign-in failed',
        description: `An unexpected error occurred during sign-in: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      console.log('Sign-in process completed.');
    }
  };

  const handleSignInWithErrorBoundary = async () => {
    try {
      await handleSignIn();
    } catch (error: any) {
      console.error('Error during sign-in:', error);
      toast({
        title: 'Sign-in failed',
        description: `An error occurred during sign-in. Please try again. ${error.message || ''}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Toaster />
      <header className="bg-secondary p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">Gemini Gateway</h1>
        {status === 'loading' ? (
          <Skeleton className="h-8 w-20" />
        ) : status === 'authenticated' ? (
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={session?.user?.image as string} alt="User Avatar" />
              <AvatarFallback>{(session?.user?.name as string)?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{session?.user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        ) : (
          <Button onClick={handleSignInWithErrorBoundary}>Sign In with Google</Button>
        )}
      </header>
      <main className="flex-grow p-4">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-sm text-muted-foreground">Start chatting with Gemini!</p>
          </CardHeader>
          <CardContent className="relative flex-1">
            <ScrollArea className="h-full">
              <div className="space-y-4" ref={chatContainerRef}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg',
                      message.role === 'user'
                        ? 'bg-accent text-accent-foreground self-end'
                        : 'bg-secondary text-secondary-foreground self-start'
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                {loading && (
                  <div className="p-3 rounded-lg bg-muted text-muted-foreground self-start">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleSubmit} className="absolute bottom-0 left-0 w-full p-4">
              <div className="flex items-center space-x-2">
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-grow"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
       {/* Debugging Section - Conditionally render session details */}
       {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 mt-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Session Details (Debug)</h3>
          {status === 'loading' ? (
            <p>Session loading...</p>
          ) : status === 'authenticated' ? (
            <>
              <p>User ID: {session?.user?.id}</p>
              <p>User Name: {session?.user?.name}</p>
              <p>User Email: {session?.user?.email}</p>
              <p>Access Token: {session?.accessToken}</p>
              <p>Session Status: {status}</p>
            </>
          ) : (
            <p>No session data available.</p>
          )}
        </div>
      )}
    </div>
  );
}
