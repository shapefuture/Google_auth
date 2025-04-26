
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
});
