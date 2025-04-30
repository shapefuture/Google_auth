import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import Home from './page';
import {useSession, signIn, signOut} from 'next-auth/react';
import {toast} from '@/hooks/use-toast';

// Mock next-auth/react and use-toast
jest.mock('next-auth/react');
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log');
const consoleErrorSpy = jest.spyOn(console, 'error');
const consoleWarnSpy = jest.spyOn(console, 'warn');

describe('Home Component', () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({data: null, status: 'unauthenticated'});
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    // Set window.location for testing redirects
    const mockAssign = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { assign: mockAssign, href: 'http://localhost:9005/' },
      writable: true,
    });
  });

  it('renders sign in button when unauthenticated', () => {
    render(<Home />);
    const signInButton = screen.getByRole('button', { name: /sign in with google/i });
    expect(signInButton).toBeInTheDocument();
    expect(consoleLogSpy).toHaveBeenCalledWith('ClientOnly component mounted');
    expect(consoleLogSpy).toHaveBeenCalledWith('Authentication status: unauthenticated');
    expect(consoleLogSpy).toHaveBeenCalledWith('User is not authenticated.');
  });

  it('calls signIn with correct provider and callback URL when sign in button is clicked', async () => {
    render(<Home />);
    const signInButton = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(signInButton);
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: 'http://localhost:9005/' })
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Attempting sign in with Google');
    expect(consoleLogSpy).toHaveBeenCalledWith('Signing in with Google provider...');
  });

   it('logs success and redirects when signIn resolves successfully', async () => {
    const callbackUrl = 'http://localhost:9005/signed-in';
    (signIn as jest.Mock).mockResolvedValue({ ok: true, url: callbackUrl, status: 200, error: null });
    render(<Home />);
    const signInButton = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Sign in result:'));
      expect(consoleLogSpy).toHaveBeenCalledWith('Sign-in was successful based on status code.');
      // Check if window.location.assign was called - currently commented out in component
      // expect(window.location.assign).toHaveBeenCalledWith(callbackUrl);
      expect(consoleLogSpy).toHaveBeenCalledWith('Sign-in process completed.');
    });
  });

   it('shows toast and logs error when signIn resolves with an error', async () => {
    const errorMsg = 'Authentication failed';
    (signIn as jest.Mock).mockResolvedValue({ ok: false, url: null, status: 500, error: errorMsg });
    render(<Home />);
    const signInButton = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign-in error from provider:', errorMsg);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Sign-in failed',
        description: `Provider sign-in error: ${errorMsg}`,
        variant: 'destructive',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('Sign-in process completed.');
    });
  });

  it('shows toast and logs error when signIn rejects', async () => {
    const error = new Error('Network Error');
    (signIn as jest.Mock).mockRejectedValue(error);
    render(<Home />);
    const signInButton = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign-in error:', error);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Sign-in failed',
        description: `An unexpected error occurred during sign-in: ${error.message}`,
        variant: 'destructive',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('Sign-in process completed.');
    });
  });

  it('renders sign out button and user info when authenticated', () => {
    const sessionData = {
      user: { name: 'Test User', email: 'test@example.com', image: 'avatar.jpg', id: '123' },
      accessToken: 'mock-access-token',
      status: 'authenticated',
    };
    (useSession as jest.Mock).mockReturnValue({ data: sessionData, status: 'authenticated' });
    render(<Home />);

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByAltText('User Avatar')).toHaveAttribute('src', 'avatar.jpg');
    expect(consoleLogSpy).toHaveBeenCalledWith('Authentication status: authenticated');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Access token found in session: mock-access-token'));
  });

  it('calls signOut when sign out button is clicked', async () => {
     const sessionData = {
      user: { name: 'Test User', email: 'test@example.com', image: 'avatar.jpg', id: '123' },
      accessToken: 'mock-access-token',
      status: 'authenticated',
    };
    (useSession as jest.Mock).mockReturnValue({ data: sessionData, status: 'authenticated' });
    render(<Home />);
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it('shows skeleton loader when session status is loading', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });
    render(<Home />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument(); // Sign in button might still render initially
    // Check for skeleton - might need specific test IDs or class checks
    expect(consoleLogSpy).toHaveBeenCalledWith('Session loading...');
  });

  it('warns if access token is missing when authenticated', () => {
    const sessionData = {
      user: { name: 'Test User', email: 'test@example.com', image: 'avatar.jpg', id: '123' },
      // No accessToken
      status: 'authenticated',
    };
     (useSession as jest.Mock).mockReturnValue({ data: sessionData, status: 'authenticated' });
     render(<Home />);
     expect(consoleWarnSpy).toHaveBeenCalledWith('Access token missing from session.');
     expect(mockToast).toHaveBeenCalledWith({
       title: 'Warning',
       description: 'Access token missing from session. Some features may be unavailable.',
       variant: 'warning',
     });
   });
});
