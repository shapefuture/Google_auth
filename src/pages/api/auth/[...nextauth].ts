import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { storeTokenData } from '@/lib/token-utils';
import { logger } from '@/lib/logger';

const log = logger.createScoped('nextauth');

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
        log.debug('JWT callback called', { 
          data: { 
            hasToken: !!token, 
            hasAccount: !!account, 
            hasUser: !!user,
            userId: token?.sub,
          } 
        });
        
        // Persist the OAuth access token to the token right after signin
        if (account) {
          // Set expiration time
          const expiresAt = Math.floor(Date.now() / 1000) + (account.expires_in as number);
          
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = expiresAt;
          
          log.info('OAuth tokens received from provider', { 
            userId: user?.id,
            data: {
              provider: account.provider,
              hasAccessToken: !!account.access_token,
              hasRefreshToken: !!account.refresh_token,
              expiresIn: account.expires_in,
              expiresAt,
              scope: account.scope,
              tokenType: account.token_type,
            }
          });
          
          // Also store token data securely
          if (user?.id) {
            log.debug('Storing token data securely', { userId: user.id });
            await storeTokenData(user.id, {
              accessToken: account.access_token as string,
              refreshToken: account.refresh_token as string,
              expiresAt,
            });
          } else {
            log.warn('User ID missing, cannot store token data securely');
          }
        } else {
          log.debug('Account information missing during JWT callback');
        }
        return token;
      } catch (error: any) {
        log.error('JWT callback error', error, { 
          data: { 
            errorMessage: error.message,
            tokenSub: token?.sub,
          } 
        });
        return token;
      }
    },
    async session({session, token, user}) {
      try {
        log.debug('Session callback called', { 
          data: { 
            hasSession: !!session, 
            hasToken: !!token, 
            hasUser: !!user,
            userId: token?.sub,
          } 
        });
        
        // Send properties to the client, like an access_token from a provider.
        session.accessToken = token.accessToken as string;
        session.expiresAt = token.expiresAt as number;
        session.user = {
          ...session.user,
          id: token.sub,
        };
        
        log.debug('Session populated with token data', {
          userId: token.sub as string,
          data: {
            hasAccessToken: !!session.accessToken,
            expiresAt: session.expiresAt,
          }
        });
        
        return session;
      } catch (error: any) {
        log.error('Session callback error', error, {
          data: { 
            errorMessage: error.message,
            tokenSub: token?.sub,
          }
        });
        return session;
      }
    },
    async redirect({ url, baseUrl }) {
      try {
        log.debug('Redirect callback called', { data: { url, baseUrl } });

        // Allows relative callback URLs
        if (url.startsWith("/")) {
          const redirectUrl = `${baseUrl}${url}`;
          log.debug('Relative redirect detected', { data: { url, redirectUrl }});
          return redirectUrl;
        }
        
        // Allows callback URLs on the same domain
        try {
          const urlHostname = new URL(url).hostname;
          const baseUrlHostname = new URL(baseUrl).hostname;
          
          if (urlHostname === baseUrlHostname) {
            log.debug('Same domain redirect detected', { data: { url, urlHostname, baseUrlHostname }});
            return url;
          }
          
          log.warn('External redirect blocked', { data: { url, urlHostname, baseUrlHostname, baseUrl }});
          return baseUrl;
        } catch (parseError) {
          log.error('Error parsing URL in redirect callback', parseError, { data: { url, baseUrl }});
          return baseUrl;
        }
      } catch (error: any) {
        log.error('Redirect callback error', error, { data: { url, baseUrl }});
        return baseUrl;
      }
    }
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug logging in development environment
  events: {
    signIn: async ({ user, account, profile, isNewUser }) => {
      log.info('Sign-in event', { 
        data: {
          userId: user.id,
          email: user.email,
          provider: account?.provider,
          isNewUser,
        }
      });
    },
    signOut: async ({ token }) => {
      log.info('Sign-out event', { data: { userId: token?.sub }});
    },
    createUser: async ({ user }) => {
      log.info('Create user event', { data: { userId: user.id, email: user.email }});
    },
    session: async ({ session, token }) => {
      log.debug('Session event', { data: { userId: token?.sub, sessionExpiry: session?.expires }});
    },
    jwt: async ({ token }) => {
      log.debug('JWT event', { data: { userId: token?.sub }});
    },
    // Add event handler to log errors during signin
    error: async (error) => {
      log.error('Authentication error event', error);
    },
  },
};

export default NextAuth(authOptions);