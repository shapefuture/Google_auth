# Gemini Gateway

Access the Gemini API using either the free tier or your own Google Cloud Project for billing and quota management.

## Overview

Gemini Gateway is a web application that allows users to interact with Google's Gemini AI models. The app provides two ways to access the Gemini API:

1. **Free Tier Access**: Use the application's shared API key with no setup required
2. **Your Own Project**: Link your Google Cloud Project for higher quotas and dedicated access

## Features

- **Free Tier Access**: No API key or setup required - start using Gemini AI immediately
- **Google Sign-In**: Securely authenticate with your Google account
- **User-Attributed Billing (Optional)**: Link your own Google Cloud Project for higher quotas
- **Chat Interface**: Interactive chat interface for conversations with Gemini AI
- **Secure Token Management**: Automatic token refresh and secure storage
- **Project Validation**: Validation of Google Cloud Project configuration

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- For deployment: A Google Cloud account with:
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

The `GOOGLE_GENAI_API_KEY` is used for the application's free tier access.

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

## Access Options

### Free Tier Access

- No API key required from users
- Instant access after signing in with Google
- Shared quota among all free tier users
- Rate-limited to ensure fair usage

### Your Google Cloud Project

For higher quotas and dedicated access:

1. Create a new project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Generative Language API
3. Enable billing for your project
4. Copy your Project ID and paste it in the application's Project Settings

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