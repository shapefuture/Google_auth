import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import Home from './page';
import {useSession, signIn, signOut} from 'next-auth/react';

jest.mock('next-auth/react');

describe('Home Component', () => {
  beforeEach(() => {
    (useSession as jest.Mock).mockReturnValue({data: null, status: 'unauthenticated'});
  });

  it('renders sign in button when unauthenticated', () => {
    render(<Home />);
    const signInButton = screen.getByText('Sign In with Google');
    expect(signInButton).toBeInTheDocument();
  });

  it('calls signIn when sign in button is clicked', async () => {
    (signIn as jest.Mock).mockResolvedValue({ok: true, url: 'https://example.com/callback'});
    render(<Home />);
    const signInButton = screen.getByText('Sign In with Google');
    fireEvent.click(signInButton);
    await waitFor(() => expect(signIn).toHaveBeenCalled());
  });

  it('renders sign out button when authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({data: {user: {name: 'Test User'}}, status: 'authenticated'});
    render(<Home />);
    const signOutButton = screen.getByText('Sign Out');
    expect(signOutButton).toBeInTheDocument();
  });

  it('updates UI after successful sign-in', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    });

    render(<Home />);

    // Wait for the component to re-render with the new session status
    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  it('redirects to callback URL after successful sign-in', async () => {
    // Mock window.location.assign
    const mockAssign = jest.fn();
    delete window.location;
    window.location = { assign: mockAssign } as any;

    (signIn as jest.Mock).mockResolvedValue({ok: true, url: 'https://example.com/callback'});
    render(<Home />);
    const signInButton = screen.getByText('Sign In with Google');
    fireEvent.click(signInButton);
    await waitFor(() => expect(signIn).toHaveBeenCalled());

    // Check if window.location.assign was called with the correct URL
    expect(mockAssign).toHaveBeenCalledWith('https://example.com/callback');

    // Restore window.location
    window.location = Object.getPrototypeOf(window).location;
  });

  it('handles sign-in error', async () => {
    (signIn as jest.Mock).mockResolvedValue({ok: false, error: 'Test Error'});
    render(<Home />);
    const signInButton = screen.getByText('Sign In with Google');
    fireEvent.click(signInButton);
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    const errorMessage = screen.getByText('Provider sign-in error: Test Error'); // Adjust based on your actual error message display
    expect(errorMessage).toBeInTheDocument();
  });

  it('handles unexpected sign-in error', async () => {
    (signIn as jest.Mock).mockRejectedValue(new Error('Unexpected Error'));
    render(<Home />);
    const signInButton = screen.getByText('Sign In with Google');
    fireEvent.click(signInButton);
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    const errorMessage = screen.getByText('An unexpected error occurred during sign-in: Unexpected Error'); // Adjust based on your actual error message display
    expect(errorMessage).toBeInTheDocument();
  });
});
