// Email service for connecting to and fetching emails from providers

// For Gmail and iCloud
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

// Connect to iCloud using Apple ID
export const connectToICloud = async (): Promise<boolean> => {
  try {
    // Store that we're attempting iCloud connection
    localStorage.setItem('email_provider', 'icloud');
    
    // For demo purposes, we'll simulate a successful connection
    // In a real implementation, you would use Apple's authentication APIs
    
    // Simulate successful connection
    localStorage.setItem('email_connected', 'true');
    localStorage.setItem('email_provider_name', 'iCloud');
    
    // Return success
    return true;
  } catch (error) {
    console.error("Error connecting to iCloud:", error);
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
    localStorage.setItem('email_provider', 'gmail');
    localStorage.setItem('email_connected', 'true');
    localStorage.setItem('email_provider_name', 'Gmail');
    return data.access_token;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    throw error;
  }
};

// Fetch recent emails from connected provider
export const fetchRecentEmails = async (count: number = 10): Promise<EmailMessage[]> => {
  try {
    const provider = localStorage.getItem('email_provider') || '';
    
    if (provider === 'gmail') {
      return fetchGmailEmails(count);
    } else if (provider === 'icloud') {
      return fetchICloudEmails(count);
    } else {
      throw new Error('No email provider connected. Please connect to an email provider first.');
    }
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
};

// Fetch recent emails from Gmail
const fetchGmailEmails = async (count: number = 10): Promise<EmailMessage[]> => {
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
        
        // Extract snippet as preview
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
    console.error("Error fetching Gmail emails:", error);
    throw error;
  }
};

// Fetch recent emails from iCloud (simulated with MockMail)
const fetchICloudEmails = async (count: number = 10): Promise<EmailMessage[]> => {
  try {
    // For demo purposes, we'll return simulated emails with diverse content
    // In a real implementation, you would use Apple's APIs
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate diverse sample emails for AI analysis
    const mockEmails: EmailMessage[] = [
      {
        id: 'mock-email-1',
        subject: 'Your Flight Confirmation - NYC to SFO',
        from: 'American Airlines <reservations@aa.com>',
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        preview: 'Thank you for booking your flight with American Airlines. Your confirmation code is: AA123456',
        body: `Dear Passenger,

Thank you for booking your flight with American Airlines.

Flight Details:
- Confirmation Code: AA123456
- Flight: AA 1234
- Date: June 15, 2023
- Departure: JFK 10:30 AM
- Arrival: SFO 1:45 PM
- Passenger: John Doe
- Seat: 14A (Economy Plus)

Please arrive at the airport at least 2 hours before your scheduled departure.
You can check in online 24 hours before your flight at aa.com.

Thank you for choosing American Airlines.`,
        important: true,
        analyzed: false
      },
      {
        id: 'mock-email-2',
        subject: 'Urgent: Security Alert - Password Reset Required',
        from: 'Apple Security <no-reply@apple.com>',
        date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        preview: 'We detected unusual activity on your Apple ID. Please reset your password immediately.',
        body: `Dear Customer,

We detected unusual sign-in activity on your Apple ID from a device in Moscow, Russia on May 10, 2023 at 3:42 PM.

If this wasn't you, your account may have been compromised. Please reset your password immediately by clicking the link below:

https://appleid.apple.com/reset

Your security code is: 847291

If you recognize this activity, you can ignore this email.

Apple Security Team`,
        important: true,
        analyzed: false
      },
      {
        id: 'mock-email-3',
        subject: 'Your Amazon Order #112-5837942-7539248 has shipped',
        from: 'Amazon.com <ship-confirm@amazon.com>',
        date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        preview: 'Your package is on its way! Track your shipment to see the delivery date.',
        body: `Hello,

Your Amazon order #112-5837942-7539248 has shipped.

Your order was sent to:
John Doe
123 Main St
Anytown, CA 94321

Your package is being shipped by UPS and the tracking number is 1Z999AA10123456789.
Estimated delivery date: May 12, 2023

Your order includes:
1. Sony WH-1000XM4 Wireless Noise Canceling Headphones - $348.00
2. USB C Charger Cable (6ft) - $12.99

Order Total: $360.99

Track your package: https://www.amazon.com/track

Thank you for shopping with Amazon!`,
        important: false,
        analyzed: false
      },
      {
        id: 'mock-email-4',
        subject: 'Team Meeting - Project Roadmap Discussion',
        from: 'Sarah Johnson <sarah.j@company.com>',
        date: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        preview: 'Hi team, Let\'s meet tomorrow at 2 PM to discuss the Q3 roadmap and feature prioritization.',
        body: `Hi team,

I'd like to schedule a meeting for tomorrow at 2 PM in Conference Room A to discuss our Q3 roadmap.

Agenda:
1. Review Q2 accomplishments
2. Discuss feature prioritization for Q3
3. Resource allocation
4. Timeline adjustments

Please come prepared with your team's updates and priorities. If you can't attend in person, here's the Zoom link:
https://zoom.us/j/123456789

Looking forward to our discussion!

Best,
Sarah Johnson
Product Manager
(555) 123-4567`,
        important: true,
        analyzed: false
      },
      {
        id: 'mock-email-5',
        subject: 'Your Monthly Invoice from Spotify',
        from: 'Spotify <no-reply@spotify.com>',
        date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        preview: 'Your Spotify Premium subscription has been renewed. Here\'s your receipt.',
        body: `Hello,

Thanks for being a Spotify Premium subscriber!

Your monthly subscription has been renewed successfully.

Invoice Details:
- Date: May 8, 2023
- Invoice #: SP-2023-05087642
- Plan: Spotify Premium Individual
- Amount: $9.99
- Payment Method: Visa ending in 4321

Your next billing date will be June 8, 2023.

You can view your complete billing history in your account settings.

Enjoy your music!
The Spotify Team`,
        important: false,
        analyzed: false
      },
      {
        id: 'mock-email-6',
        subject: 'Job Application Update - Software Developer Position',
        from: 'TechCorp Recruiting <recruiting@techcorp.com>',
        date: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        preview: 'Thank you for your application. We would like to invite you for an interview next week.',
        body: `Dear Applicant,

Thank you for applying for the Senior Software Developer position at TechCorp.

We were impressed with your qualifications and experience, and we would like to invite you for a virtual interview. Please select a time slot that works for you:

- Monday, May 15, 10:00 AM - 11:30 AM PST
- Tuesday, May 16, 2:00 PM - 3:30 PM PST
- Wednesday, May 17, 11:00 AM - 12:30 PM PST

The interview will be conducted via Zoom and will include a technical assessment and a conversation with the engineering team.

Please reply to this email with your preferred time slot, and we will send you the meeting details.

We look forward to speaking with you!

Best regards,
Jennifer Smith
Recruiting Manager
TechCorp
(555) 987-6543`,
        important: true,
        analyzed: false
      },
      {
        id: 'mock-email-7',
        subject: 'Your Subscription Renewal Notice',
        from: 'Netflix <info@netflix.com>',
        date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        preview: 'Your Netflix subscription will renew automatically on May 15, 2023.',
        body: `Hi there,

This is a reminder that your Netflix subscription will automatically renew on May 15, 2023.

Subscription Details:
- Plan: Premium (4K Ultra HD + 4 screens)
- Monthly Price: $19.99
- Next Billing Date: May 15, 2023
- Payment Method: Mastercard ending in 8765

If you want to make changes to your subscription, please visit your account page at netflix.com/account.

Thank you for being a Netflix member!

The Netflix Team`,
        important: false,
        analyzed: false
      },
      {
        id: 'mock-email-8',
        subject: 'Invitation to Speak at Tech Conference 2023',
        from: 'TechConf Organizers <speakers@techconf2023.com>',
        date: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
        preview: 'We would like to invite you to be a speaker at Tech Conference 2023 in San Francisco.',
        body: `Dear Tech Professional,

On behalf of the TechConf 2023 organizing committee, I am delighted to invite you to speak at our annual conference, which will be held on September 15-17, 2023, at the Moscone Center in San Francisco.

Based on your expertise and contributions to the field, we believe you would be an excellent speaker for our AI and Machine Learning track. We would be honored if you could present a 45-minute session on a topic of your choice within this domain.

As a speaker, you will receive:
- Complimentary conference pass ($1,499 value)
- Travel allowance of up to $1,000
- 2 nights accommodation at the conference hotel
- Speaker dinner and networking events

Please let us know if you are interested by May 20, 2023, by completing the speaker submission form at:
https://techconf2023.com/speaker-submission

We look forward to your positive response!

Best regards,
Michael Chen
Speaker Coordinator
TechConf 2023
speakers@techconf2023.com`,
        important: true,
        analyzed: false
      },
      {
        id: 'mock-email-9',
        subject: 'Your Credit Card Statement is Ready',
        from: 'Chase Bank <statements@chase.com>',
        date: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
        preview: 'Your monthly statement for account ending in 5678 is now available online.',
        body: `Dear Valued Customer,

Your monthly credit card statement for the account ending in 5678 is now available online.

Statement Summary:
- Statement Period: April 10 - May 9, 2023
- New Balance: $1,247.63
- Minimum Payment Due: $35.00
- Payment Due Date: June 5, 2023

Recent Transactions:
- May 7: Amazon.com - $129.99
- May 5: Whole Foods Market - $87.32
- May 3: Shell Gas Station - $45.67
- May 1: Netflix Subscription - $19.99
- April 28: Restaurant Charge - $78.45

To view your complete statement and make a payment, please log in to your account at chase.com or use the Chase mobile app.

Thank you for being a Chase customer.

This is an automated email. Please do not reply.`,
        important: false,
        analyzed: false
      },
      {
        id: 'mock-email-10',
        subject: 'Important: Your Tax Return Status Update',
        from: 'Internal Revenue Service <do-not-reply@irs.gov>',
        date: new Date(Date.now() - 129600000).toISOString(), // 1.5 days ago
        preview: 'Your federal tax return has been processed. Your refund has been approved.',
        body: `INTERNAL REVENUE SERVICE

Tax Return Status Update

Taxpayer ID: ***-**-1234
Tax Year: 2022

Dear Taxpayer,

We are pleased to inform you that your federal tax return for the year 2022 has been processed.

Status: Refund Approved
Refund Amount: $1,842.00
Refund Method: Direct Deposit
Expected Deposit Date: May 15, 2023

Your refund will be deposited to the bank account ending in 9876.

You can check the status of your refund at:
https://www.irs.gov/refunds

If you have not received your refund by May 20, 2023, please visit our website or call 1-800-829-1040.

Thank you,
Internal Revenue Service
United States Department of the Treasury

This is an automated message. Please do not reply.`,
        important: true,
        analyzed: false
      }
    ];
    
    return mockEmails;
  } catch (error) {
    console.error("Error fetching iCloud emails:", error);
    throw error;
  }
};


