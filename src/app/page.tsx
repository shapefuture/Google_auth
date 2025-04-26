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
  return (
    <ClientOnly />
  );
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = {role: 'user' as const, content: prompt};
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const response = await generateResponse({prompt: prompt, accessToken: accessToken ?? undefined});
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
    try {
      const result = await signIn('google', {callbackUrl: window.location.href});
      if (result?.error) {
        toast({
          title: 'Sign-in failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Sign-in failed',
        description: error.message || 'Could not sign in with Google',
        variant: 'destructive',
      });
    }
  };

  const {data: session, status} = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.accessToken) {
        setAccessToken(session.accessToken as string);
      }
    }
  }, [session, status]);

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
          <Button onClick={handleSignIn}>Sign In with Google</Button>
        )}
      </header>
      <main className="flex-grow p-4">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-sm text-muted-foreground">
              Start chatting with Gemini!
            </p>
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
    </div>
  );
}

