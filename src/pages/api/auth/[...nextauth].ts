import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { storeTokenData } from '@/lib/token-utils';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: 'email openid https://www.googleapis.com/auth/generative-language',
          access_type: 'offline',
          response_type: 'code',
          include_granted_scopes: 'true',
          prompt: 'consent', // Force consent screen to ensure we get a refresh token
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({token, account, user}) {
      try {
        // Persist the OAuth access token to the token right after signin
        if (account) {
          // Set expiration time
          const expiresAt = Math.floor(Date.now() / 1000) + (account.expires_in as number);
          
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = expiresAt;
          
          console.log('Access token persisted in JWT:', account.access_token); // Log the access token
          console.log('Refresh token obtained:', account.refresh_token ? 'Yes' : 'No');
          
          // Also store token data securely
          if (user?.id) {
            await storeTokenData(user.id, {
              accessToken: account.access_token as string,
              refreshToken: account.refresh_token as string,
              expiresAt,
            });
          }
        } else {
          console.warn('Account information missing during JWT callback.');
        }
        return token;
      } catch (error: any) {
        console.error('JWT callback error:', error.message, error.stack);
        return token;
      }
    },
    async session({session, token, user}) {
      try {
        // Send properties to the client, like an access_token from a provider.
        session.accessToken = token.accessToken as string;
        session.expiresAt = token.expiresAt as number;
        session.user = {
          ...session.user,
          id: token.sub,
        };
        return session;
      } catch (error: any) {
        console.error('Session callback error:', error.message, error.stack);
        return session;
      }
    },
    async redirect({ url, baseUrl }) {
      try {
        console.log('Redirect callback called', { url, baseUrl }); // Log the input

        // Allows relative callback URLs
        if (url.startsWith("/")) {
          const redirectUrl = `${baseUrl}${url}`;
          console.log('Relative redirect detected, adjusted to:', redirectUrl);
          return redirectUrl;
        }
        // Allows callback URLs on the same domain
        const urlHostname = new URL(url).hostname;
        const baseUrlHostname = new URL(baseUrl).hostname;
        if (urlHostname === baseUrlHostname) {
          console.log('Same domain redirect detected:', url);
          return url;
        }
        console.log('External redirect blocked, using baseUrl:', baseUrl);
        return baseUrl;
      } catch (error: any) {
        console.error('Redirect callback error:', error);
        return baseUrl;
      }
    }
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug logging in development environment
  events: {
    signIn: async (message) => {
      console.log('signIn event:', message);
    },
    signOut: async (message) => {
      console.log('signOut event:', message);
    },
    createUser: async (message) => {
      console.log('createUser event:', message);
    },
    session: async (message) => {
      console.log('session event:', message);
    },
    jwt: async (message) => {
      console.log('jwt event:', message);
    },
    // Add event handler to log errors during signin
    error: async (message) => {
      console.error('Authentication error event:', message);
    },
  },
};

export default NextAuth(authOptions);