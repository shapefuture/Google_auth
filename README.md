# Gemini Gateway

Access the Gemini API using your own Google Cloud Project for billing and quota management.

## Overview

Gemini Gateway is a web application that allows users to interact with Google's Gemini AI models. The app authenticates users via Google Sign-In and allows them to link their own Google Cloud Project for billing attribution, giving them full control over their API usage and costs.

## Features

- **Google Sign-In**: Securely authenticate with your Google account
- **User-Attributed Billing**: Link your own Google Cloud Project to use the Gemini API with your own quota and billing
- **Chat Interface**: Interactive chat interface for conversations with Gemini AI
- **Secure Token Management**: Automatic token refresh and secure storage
- **Project Validation**: Validation of Google Cloud Project configuration

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- A Google Cloud account with:
  - Generative Language API enabled
  - OAuth 2.0 credentials configured

### Environment Setup

1. Create a `.env.local` file with the following variables:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_GENAI_API_KEY=your_gemini_api_key
NEXTAUTH_URL=http://localhost:9005
NEXTAUTH_SECRET=your_nextauth_secret
ENCRYPTION_SECRET=your_encryption_secret
```

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:9005](http://localhost:9005) in your browser

## Setting Up Your Google Cloud Project

To use Gemini Gateway with your own Google Cloud Project:

1. Create a new project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Generative Language API
3. Set up OAuth consent screen:
   - Set User Type as External
   - Add scopes: `https://www.googleapis.com/auth/generative-language`, `email`, `openid`
   - Add authorized domains
4. Create OAuth 2.0 Client ID credentials:
   - Choose Web application type
   - Add authorized redirect URIs:
     - `http://localhost:9005/api/auth/callback/google` (development)
     - `https://your-production-domain.com/api/auth/callback/google` (production)
5. Enable billing for your project
6. Copy your Project ID and paste it in the application's Project Settings

## Running Tests

```bash
npm test
```

## Deployment

1. Configure environment variables on your hosting platform
2. Build the application:

```bash
npm run build
```

3. Deploy to your hosting platform of choice (Vercel, Netlify, Google Cloud)

## Security

This application implements several security best practices:

- Secure token storage using HTTP-only cookies
- Encryption of sensitive data
- Proper OAuth 2.0 flow implementation
- Regular token refresh to prevent expiration

## License

[MIT](LICENSE)