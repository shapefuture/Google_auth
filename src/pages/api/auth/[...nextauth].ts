import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

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
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({token, account}) {
      try {
        // Persist the OAuth access token to the token right after signin
        if (account) {
          token.accessToken = account.access_token;
        }
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },
    async session({session, token, user}) {
      try {
        // Send properties to the client, like an access_token from a provider.
        session.accessToken = token.accessToken as string;
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
    async redirect({ url, baseUrl }) {
      try {
        // Allows relative callback URLs
        if (url.startsWith("/")) return `${baseUrl}${url}`
        // Allows callback URLs on the same domain
        else if (new URL(url).hostname === new URL(baseUrl).hostname) return url
        return baseUrl
      } catch (error) {
        console.error('Redirect callback error:', error);
        return baseUrl;
      }
    }
  },
  debug: true, // Enable debug logging
  events: {
    signIn: async (message) => console.log('signIn', message),
    signOut: async (message) => console.log('signOut', message),
    createUser: async (message) => console.log('createUser', message),
    session: async (message) => console.log('session', message),
    jwt: async (message) => console.log('jwt', message),
  },
};

export default NextAuth(authOptions);
