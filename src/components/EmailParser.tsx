import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MoodToggle from "@/components/MoodToggle";
import { analyzeEmailWithAI } from "@/utils/aiParsingService";
import { connectToGmail, fetchRecentEmails, EmailMessage } from "@/lib/emailService";
import { useLocation } from "react-router-dom";

const EmailParser = () => {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [parsedResult, setParsedResult] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [connectedEmails, setConnectedEmails] = useState<any[]>([]);
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);

  // Advanced email parser function that handles various email formats
  const parseEmail = (emailText: string) => {
    if (!emailText.trim()) {
      toast({
        title: "Empty Input",
        description: "Please enter or upload an email to parse.",
        variant: "destructive",
      });
      return null;
    }
    
    // Initialize result object
    const result: Record<string, string> = {};
    
    // Step 1: Try to extract standard email headers if present
    const headerPatterns = {
      subject: /Subject:(.+?)(?:\r?\n)/i,
      from: /From:(.+?)(?:\r?\n)/i,
      to: /To:(.+?)(?:\r?\n)/i,
      date: /Date:(.+?)(?:\r?\n)/i,
      cc: /Cc:(.+?)(?:\r?\n)/i,
      bcc: /Bcc:(.+?)(?:\r?\n)/i,
      replyTo: /Reply-To:(.+?)(?:\r?\n)/i,
      messageId: /Message-ID:(.+?)(?:\r?\n)/i,
    };

    // Extract header information if available
    Object.entries(headerPatterns).forEach(([key, pattern]) => {
      const match = emailText.match(pattern);
      if (match && match[1]) {
        result[key] = match[1].trim();
      } else {
        result[key] = "Not found";
      }
    });

    // Step 2: Extract all email addresses from the content
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const allEmailAddresses = [...new Set(emailText.match(emailRegex) || [])];

    // Step 3: Extract URLs from the email
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const urls = emailText.match(urlPattern) || [];
    result["urls"] = urls.length > 0 ? urls.join(", ") : "No URLs found";
    
    // Step 4: List all email addresses found
    result["emailAddresses"] = allEmailAddresses.length > 0 ? 
      allEmailAddresses.join(", ") : 
      "No email addresses found";

    // Step 5: Try to extract the body of the email
    // First try the standard approach for emails with headers
    let body = "";
    const bodyPattern = /\r?\n\r?\n([\s\S]*)/;
    const bodyMatch = emailText.match(bodyPattern);
    
    if (bodyMatch && bodyMatch[1]) {
      body = bodyMatch[1].trim();
    } else {
      // For emails without clear header separation, use the full text
      body = emailText;
    }
    
    // Step 6: Try to detect email type/purpose
    if (emailText.toLowerCase().includes("unsubscribe") || 
        emailText.toLowerCase().includes("newsletter") ||
        emailText.toLowerCase().includes("subscription")) {
      result["type"] = "Newsletter/Promotional";
    } else if (emailText.toLowerCase().includes("invoice") || 
               emailText.toLowerCase().includes("payment") ||
               emailText.toLowerCase().includes("receipt")) {
      result["type"] = "Transaction/Receipt";
    } else if (emailText.toLowerCase().includes("confirm") || 
               emailText.toLowerCase().includes("verification") ||
               emailText.toLowerCase().includes("activate")) {
      result["type"] = "Account Verification";
    } else if (emailText.toLowerCase().includes("password") || 
               emailText.toLowerCase().includes("reset")) {
      result["type"] = "Password Reset";
    } else {
      result["type"] = "General Correspondence";
    }

    // Step 8: Look for action items or key information
    if (emailText.toLowerCase().includes("code:") || 
        emailText.toLowerCase().includes("confirmation code")) {
      const codePattern = /code:?\s*([a-zA-Z0-9]{4,8})/i;
      const codeMatch = emailText.match(codePattern);
      if (codeMatch && codeMatch[1]) {
        result["verificationCode"] = codeMatch[1];
      }
    }

    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setEmailInput(content || "");
      // Clear the file input
      e.target.value = "";
      
      // Add a toast notification
      toast({
        title: "Email Loaded",
        description: `File "${file.name}" has been loaded successfully.`,
      });
    };
    reader.readAsText(file);
  };

  const handleParseClick = async () => {
    setIsLoading(true);
    // Simulate processing time
    setTimeout(() => {
      const result = parseEmail(emailInput);
      
      // Only set parsed result if not in advanced mode
      if (!isAdvancedMode) {
        setParsedResult(result);
        setIsLoading(false);
        if (result) {
          toast({
            title: "Email Parsed Successfully",
            description: "We've extracted the key information from your email.",
          });
        }
      } else if (result) {
        // In advanced mode, just store the result but don't display basic parsing
        setParsedResult(result);
        // Directly perform AI analysis
        performAdvancedAnalysis(emailInput);
      } else {
        setIsLoading(false);
      }
    }, 1000);
  };

  const performAdvancedAnalysis = async (emailContent: string) => {
    try {
      setIsLoading(true);
      // Get the GROQ API key from environment variables
      const apiKey = import.meta.env.VITE_GROQ_API || "";
      
      if (!apiKey) {
        toast({
          title: "API Key Missing",
          description: "Please add your GROQ API key to the .env file as VITE_GROQ_API.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const aiResult = await analyzeEmailWithAI(emailContent, apiKey);
      setAiAnalysisResult(aiResult);
      
      toast({
        title: "Advanced Analysis Complete",
        description: "AI has extracted deeper insights from your email.",
      });
    } catch (error) {
      console.error("AI analysis error:", error);
      toast({
        title: "Advanced Analysis Failed",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleEmail = () => {
    const sampleEmail = `From: john.doe@example.com
To: jane.smith@example.com
Subject: Meeting Tomorrow
Date: Mon, 25 Apr 2025 09:30:00 -0700
Cc: team@example.com
Reply-To: john.doe@example.com

Hi Jane,

Just a reminder about our meeting tomorrow at 10:00 AM in the conference room.

Please bring your quarterly report and we'll discuss the new project requirements.

You can also check the details on our project page: https://example.com/projects/123`;
    setEmailInput(sampleEmail);
  };

  const handleFacebookSampleEmail = () => {
    const facebookEmail = `From: security@facebookmail.com
To: user@example.com
Subject: Facebook Security Code
Date: Mon, 25 Apr 2025 09:30:00 -0700

Hi User,

Your Facebook security code is: 123456

This code can be used to verify your identity on Facebook.

If you didn't request this code, you can ignore this message.

Thanks,
The Facebook Security Team`;
    setEmailInput(facebookEmail);
  };

  const handleShippingEmailSample = () => {
    const shippingEmail = `From: shipping@amazon.com
To: customer@example.com
Subject: Your Amazon Order Has Shipped
Date: Mon, 25 Apr 2025 09:30:00 -0700

Hello Customer,

Your order #123-4567890-1234567 has shipped and is on its way!

Your tracking number is: 1Z999AA10123456789
You can track your package at: https://track.carrier.com/tracking?number=1Z999AA10123456789

Your order contains:
1x Wireless Headphones - $149.99
1x Phone Case - $24.99

Estimated delivery date: April 26, 2025

If you have any questions, please contact Amazon Customer Service.

Thank you for shopping with us!
The Amazon.com Team`;
    setEmailInput(shippingEmail);
  };

  const handleToggleMode = () => {
    setIsAdvancedMode(!isAdvancedMode);
    // Clear AI results when toggling out of advanced mode
    if (isAdvancedMode) {
      setAiAnalysisResult(null);
    }
  };

  // Add a function to handle email connection (placeholder for now)
  const handleConnectEmail = async (provider: string) => {
    if (provider === 'Gmail') {
      // Use the real Gmail connection function
      setIsLoading(true);
      try {
        const success = await connectToGmail();
        if (!success) {
          toast({
            title: "Connection Failed",
            description: "Failed to connect to Gmail. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error connecting to Gmail:", error);
        toast({
          title: "Connection Error",
          description: "An error occurred while connecting to Gmail.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // This should not be reached since we're removing the Outlook button
      toast({
        title: `${provider} Connection`,
        description: "This provider is not yet implemented.",
        variant: "destructive",
      });
    }
  };

  // Add a function to analyze a connected email
  const analyzeConnectedEmail = async (emailId: string) => {
    // Find the email
    const emailToAnalyze = connectedEmails.find(email => email.id === emailId);
    if (!emailToAnalyze) return;
    
    // Mark as loading
    setIsLoading(true);
    
    // Update the email in the list to show it's being analyzed
    setConnectedEmails(prev => 
      prev.map(email => 
        email.id === emailId ? {...email, analyzing: true} : email
      )
    );
    
    // Simulate email content based on the subject
    let emailContent = "";
    if (emailToAnalyze.subject.includes("Amazon")) {
      emailContent = handleShippingEmailSample();
    } else if (emailToAnalyze.subject.includes("Meeting")) {
      emailContent = handleSampleEmail();
    } else {
      emailContent = handleFacebookSampleEmail();
    }
    
    // Set the email input to the content
    setEmailInput(emailContent);
    
    // Perform AI analysis
    try {
      const result = parseEmail(emailContent);
      setParsedResult(result);
      await performAdvancedAnalysis(emailContent);
      
      // Mark the email as analyzed
      setConnectedEmails(prev => 
        prev.map(email => 
          email.id === emailId ? {...email, analyzing: false, analyzed: true} : email
        )
      );
    } catch (error) {
      console.error("Error analyzing email:", error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing this email. Please try again.",
        variant: "destructive",
      });
      
      // Reset the analyzing state
      setConnectedEmails(prev => 
        prev.map(email => 
          email.id === emailId ? {...email, analyzing: false} : email
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to fetch Gmail emails
  const fetchGmailEmails = async () => {
    setIsFetchingEmails(true);
    try {
      const emails = await fetchRecentEmails(10);
      setConnectedEmails(emails);
      setIsConnected(true);
      
      toast({
        title: "Emails Retrieved",
        description: `Successfully fetched ${emails.length} recent emails from your Gmail account.`,
      });
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Fetch Failed",
        description: "Failed to retrieve emails. Please reconnect to Gmail.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingEmails(false);
    }
  };

  // Check if user just completed authentication
  useEffect(() => {
    if (location.state?.authenticated) {
      toast({
        title: "Authentication Successful",
        description: "You've successfully connected to Gmail. Fetching your emails...",
      });
      fetchGmailEmails();
    }
  }, [location]);

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${isAdvancedMode ? 'bg-primary text-white rounded-lg py-6' : ''}`}>
      <div className="space-y-6">
        <div className="flex justify-center mb-4">
          <MoodToggle 
            isAdvanced={isAdvancedMode}
            onToggle={handleToggleMode}
          />
        </div>
        
        <div className="space-y-2">
          <p className={`text-lg text-center ${isAdvancedMode ? 'text-white' : 'text-gray-700'}`}>
            {isAdvancedMode 
              ? 'Advanced Mode: AI-powered email analysis for deeper insights' 
              : 'Upload or paste your email text to parse important information'}
          </p>
        </div>
        
        {/* Email Input Section - Different UI based on mode */}
        {!isAdvancedMode ? (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-primary/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <label 
                    htmlFor="email-upload" 
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-md cursor-pointer btn-transition bg-primary/10 hover:bg-primary/20 text-primary"
                  >
                    <Upload size={18} />
                    <span>Upload Email File</span>
                    <input
                      id="email-upload"
                      type="file"
                      accept=".txt,.eml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-gray-500 hidden sm:inline">or</span>
                  <span className="text-gray-500 block sm:hidden w-full text-center">or use sample</span>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline"
                      onClick={handleSampleEmail}
                      className="text-primary border-primary/20 hover:bg-primary/10 w-full sm:w-auto"
                    >
                      Standard Email
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleFacebookSampleEmail}
                      className="text-primary border-primary/20 hover:bg-primary/10 w-full sm:w-auto"
                    >
                      Facebook Email
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleShippingEmailSample}
                      className="text-primary border-primary/20 hover:bg-primary/10 w-full sm:w-auto"
                    >
                      Shipping Email
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  className="min-h-[200px] resize-y border-primary/20 focus:border-primary"
                  placeholder="Paste email content here..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                
                <div className="text-center pt-2">
                  <Button 
                    onClick={handleParseClick}
                    className="hover-scale bg-primary hover:bg-primary/90 text-white"
                    disabled={isLoading || !emailInput.trim()}
                  >
                    {isLoading ? "Parsing..." : "Parse Email"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-white/20 bg-primary/80">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-4">Connect to Your Email</h3>
                  <p className="text-white/80 mb-6">Connect your email account to automatically retrieve and analyze your emails</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <Button 
                    className="bg-white text-primary hover:bg-white/90 flex items-center justify-center gap-2 py-6"
                    onClick={() => handleConnectEmail('Gmail')}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    )}
                    Connect Gmail
                  </Button>
                </div>
                
                <div className="text-center mt-4">
                  <p className="text-white/70 mb-4">Or analyze a single email</p>
                  <Textarea
                    className="min-h-[100px] resize-y bg-white/10 text-white border-white/20 focus:border-white placeholder:text-white/50 mb-4"
                    placeholder="Paste email content here for AI analysis..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  
                  <Button 
                    onClick={handleParseClick}
                    className="hover-scale bg-white text-primary hover:bg-white/90"
                    disabled={isLoading || !emailInput.trim()}
                  >
                    {isLoading ? "Analyzing with AI..." : "Analyze with AI"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Basic Results Section */}
        {parsedResult && !isAdvancedMode && (
          <Card className="shadow-md animate-fade-in border-primary/10">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4 text-primary">Parsed Results</h3>
              <div className="grid gap-3">
                {Object.entries(parsedResult).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 items-center border-b border-gray-100 pb-2">
                    <span className="font-medium text-gray-700 capitalize">{key}:</span>
                    <span className="col-span-2 text-gray-600 break-words">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Advanced AI Results Section */}
        {parsedResult && isAdvancedMode && (
          <div className="space-y-4">
            {/* AI Analysis Results */}
            {aiAnalysisResult ? (
              <Card className="shadow-md animate-fade-in border-white/20 bg-primary/90">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-6 text-white text-center">AI Analysis Results</h3>
                  
                  <div className="space-y-6">
                    {/* Context Type */}
                    <div className="p-4 bg-white/10 rounded-lg">
                      <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Contextual Email Type:</h4>
                      <p className="text-white/90 text-lg">{aiAnalysisResult.contextualType}</p>
                    </div>
                    
                    {/* Key Insights */}
                    <div className="p-4 bg-white/10 rounded-lg">
                      <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Key Insights:</h4>
                      <ul className="list-disc pl-5 space-y-2 mt-3">
                        {aiAnalysisResult.keyInsights.map((insight: string, idx: number) => (
                          <li key={idx} className="text-white/90">{insight}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Sentiment and Urgency */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Sentiment:</h4>
                        <p className={`text-lg font-medium mt-3 ${
                          aiAnalysisResult.sentimentAnalysis === "Positive" ? "text-green-300" :
                          aiAnalysisResult.sentimentAnalysis === "Negative" ? "text-red-300" :
                          aiAnalysisResult.sentimentAnalysis === "Urgent" ? "text-yellow-300" :
                          "text-white/90"
                        }`}>
                          {aiAnalysisResult.sentimentAnalysis}
                        </p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Urgency Level:</h4>
                        <p className={`text-lg font-medium mt-3 ${
                          aiAnalysisResult.urgencyLevel === "High" ? "text-red-300" :
                          aiAnalysisResult.urgencyLevel === "Medium" ? "text-yellow-300" :
                          "text-green-300"
                        }`}>
                          {aiAnalysisResult.urgencyLevel}
                        </p>
                      </div>
                    </div>
                    
                    {/* Suggested Actions */}
                    {aiAnalysisResult.suggestedActions && aiAnalysisResult.suggestedActions.length > 0 && (
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Suggested Actions:</h4>
                        <ul className="list-disc pl-5 space-y-2 mt-3">
                          {aiAnalysisResult.suggestedActions.map((action: string, idx: number) => (
                            <li key={idx} className="text-white/90">{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Entity Recognition */}
                    {aiAnalysisResult.entityRecognition && Object.values(aiAnalysisResult.entityRecognition).some(arr => arr.length > 0) && (
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Entities Detected:</h4>
                        <div className="space-y-3 mt-3">
                          {Object.entries(aiAnalysisResult.entityRecognition).map(([entityType, entities]: [string, string[]]) => 
                            entities.length > 0 && (
                              <div key={entityType} className="mb-2">
                                <h5 className="text-white/80 capitalize font-medium">{entityType}:</h5>
                                <p className="text-white/90 pl-3">{entities.join(", ")}</p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              isLoading && (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-pulse text-white">Analyzing with AI...</div>
                </div>
              )
            )}
          </div>
        )}
        
        {/* Connected Emails List in Advanced Mode */}
        {isAdvancedMode && connectedEmails.length > 0 && (
          <Card className="shadow-md animate-fade-in border-white/20 bg-primary/80 mt-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Your Emails</h3>
              <div className="space-y-4">
                {connectedEmails.map(email => (
                  <div 
                    key={email.id} 
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                      email.analyzed 
                        ? 'bg-white/20' 
                        : email.important 
                          ? 'bg-white/10 border-l-4 border-yellow-300' 
                          : 'bg-white/10'
                    }`}
                    onClick={() => analyzeConnectedEmail(email.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-white">{email.subject}</h4>
                        <p className="text-white/70 text-sm">{email.from} • {email.date}</p>
                      </div>
                      {email.analyzing ? (
                        <div className="animate-pulse text-white/70">Analyzing...</div>
                      ) : email.analyzed ? (
                        <div className="text-green-300 text-sm">Analyzed</div>
                      ) : email.important ? (
                        <div className="text-yellow-300 text-sm">Important</div>
                      ) : null}
                    </div>
                    <p className="text-white/80 mt-2 text-sm">{email.preview}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailParser;




















