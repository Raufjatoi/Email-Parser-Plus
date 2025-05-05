// Email service for connecting to and fetching emails from providers

// For Gmail using Google OAuth
export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  preview: string;
  body: string;
  important: boolean;
  analyzed: boolean;
}

// Connect to Gmail using OAuth
export const connectToGmail = async (): Promise<boolean> => {
  try {
    // Google OAuth configuration
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const REDIRECT_URI = window.location.origin + '/auth/callback';
    const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
    
    // Redirect to Google's OAuth page
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&response_type=code&access_type=offline`;
    
    window.location.href = authUrl;
    return true;
  } catch (error) {
    console.error("Error connecting to Gmail:", error);
    return false;
  }
};

// Handle OAuth callback and get access token
export const handleOAuthCallback = async (code: string): Promise<string> => {
  try {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = window.location.origin + '/auth/callback';
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    const data = await response.json();
    // Store token in localStorage or secure cookie
    localStorage.setItem('email_access_token', data.access_token);
    return data.access_token;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    throw error;
  }
};

// Fetch recent emails from Gmail
export const fetchRecentEmails = async (count: number = 10): Promise<EmailMessage[]> => {
  try {
    const accessToken = localStorage.getItem('email_access_token');
    
    if (!accessToken) {
      throw new Error('No access token found. Please connect to Gmail first.');
    }
    
    // Fetch list of messages
    const listResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${count}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const listData = await listResponse.json();
    
    // Fetch details for each message
    const emails: EmailMessage[] = await Promise.all(
      listData.messages.map(async (message: { id: string }) => {
        const detailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        
        const messageData = await detailResponse.json();
        
        // Extract headers
        const headers = messageData.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';
        
        // Extract snippet/preview
        const preview = messageData.snippet || '';
        
        // Extract body (simplified - in reality you'd need to handle different MIME types)
        let body = '';
        if (messageData.payload.body.data) {
          body = atob(messageData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (messageData.payload.parts) {
          const textPart = messageData.payload.parts.find((part: any) => part.mimeType === 'text/plain');
          if (textPart && textPart.body.data) {
            body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }
        
        return {
          id: message.id,
          subject,
          from,
          date,
          preview,
          body,
          important: messageData.labelIds.includes('IMPORTANT'),
          analyzed: false
        };
      })
    );
    
    return emails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};