# Email Parser+

![Email Parser+](public/icon.png)

## Overview

Email Parser+ is a modern web application that helps users extract and analyze important information from their emails. Using AI-powered parsing, it identifies key details, sentiment, and actionable items from email content.

## Features

- **Email Connection**: Securely connect your Gmail account via OAuth
- **AI Analysis**: Extract key insights, sentiment, and important entities from emails
- **Basic & Advanced Modes**: Choose between simple parsing or in-depth AI analysis
- **Privacy-Focused**: Your emails are processed securely and never stored

## Tech Stack

- React 18 with TypeScript
- Vite for fast development and optimized builds
- TailwindCSS with shadcn/ui components
- React Router for navigation
- TanStack Query for data fetching
- GROQ API for AI processing

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- GROQ API key for AI features

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Raufjatoi/Email-Parser-Plus.git
   cd Email-Parser-Plus
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the root directory with your API keys
   ```
   VITE_GROQ_API=your_groq_api_key
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Deployment

Build the application for production:

```bash
npm run build
# or
yarn build
```

The build artifacts will be stored in the `dist/` directory.

## Contact

Abdul Rauf Jatoi - [Portfolio](https://rauf-psi.vercel.app/)