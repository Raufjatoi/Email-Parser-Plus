import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MoodToggle from "@/components/MoodToggle";
import { analyzeEmailWithAI } from "@/utils/aiParsingService";
import { connectToGmail, connectToICloud, fetchRecentEmails, EmailMessage } from "@/lib/emailService";
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
  const [provider, setProvider] = useState<string>('');

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
  const handleConnectEmail = async (providerName: string) => {
    setProvider(providerName);
    setIsLoading(true);
    try {
      let success = false;
      
      if (providerName === 'Gmail') {
        success = await connectToGmail();
      } else if (providerName === 'MockMail') {
        // Use the iCloud connection function but with our MockMail branding
        success = await connectToICloud();
        
        if (success) {
          // Update the provider name in localStorage to show MockMail instead of iCloud
          localStorage.setItem('email_provider_name', 'MockMail');
          
          // Fetch the mock emails
          await fetchEmails();
          setIsConnected(true);
        }
      }
      
      if (!success) {
        toast({
          title: "Connection Failed",
          description: `Failed to connect to ${providerName}. Please try again.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error connecting to ${providerName}:`, error);
      toast({
        title: "Connection Error",
        description: `An error occurred while connecting to ${providerName}.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    
    try {
      // Set the email input to the content
      setEmailInput(emailToAnalyze.body);
      
      // Parse the email
      const result = parseEmail(emailToAnalyze.body);
      setParsedResult(result);
      
      // Perform AI analysis
      const apiKey = import.meta.env.VITE_GROQ_API || "";
      if (apiKey) {
        const aiResult = await analyzeEmailWithAI(emailToAnalyze.body, apiKey);
        setAiAnalysisResult(aiResult);
      } else {
        // If no API key, use the simulated AI analysis
        const simulatedResult = {
          contextualType: emailToAnalyze.subject.includes("Flight") ? "Travel Confirmation" :
                          emailToAnalyze.subject.includes("Security") ? "Security Alert" :
                          emailToAnalyze.subject.includes("Order") ? "Purchase Confirmation" :
                          emailToAnalyze.subject.includes("Meeting") ? "Calendar Event" :
                          emailToAnalyze.subject.includes("Invoice") ? "Financial Transaction" :
                          "General Communication",
          keyInsights: [
            `Subject: ${emailToAnalyze.subject}`,
            `From: ${emailToAnalyze.from}`,
            `Date: ${new Date(emailToAnalyze.date).toLocaleString()}`,
            emailToAnalyze.body.split('\n')[0]
          ],
          sentimentAnalysis: emailToAnalyze.important ? "Urgent" : "Neutral",
          urgencyLevel: emailToAnalyze.important ? "High" : "Medium",
          suggestedActions: [
            emailToAnalyze.subject.includes("Flight") ? "Add to calendar" : 
            emailToAnalyze.subject.includes("Security") ? "Reset password" :
            emailToAnalyze.subject.includes("Order") ? "Track package" :
            emailToAnalyze.subject.includes("Meeting") ? "Respond to invitation" :
            emailToAnalyze.subject.includes("Invoice") ? "Review payment" :
            "Archive email"
          ],
          entityRecognition: {
            people: [],
            organizations: [emailToAnalyze.from.split('<')[0].trim()],
            dates: [new Date(emailToAnalyze.date).toLocaleDateString()],
            locations: [],
            other: []
          }
        };
        setAiAnalysisResult(simulatedResult);
      }
      
      // Mark the email as analyzed
      setConnectedEmails(prev => 
        prev.map(email => 
          email.id === emailId ? {...email, analyzing: false, analyzed: true} : email
        )
      );
      
      toast({
        title: "Analysis Complete",
        description: "Email has been analyzed successfully.",
      });
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

  // Add this function to fetch emails
  const fetchEmails = async () => {
    setIsFetchingEmails(true);
    try {
      const emails = await fetchRecentEmails(10);
      setConnectedEmails(emails);
      setIsConnected(true);
      
      const providerName = localStorage.getItem('email_provider_name') || 'email';
      
      toast({
        title: "Emails Retrieved",
        description: `Successfully fetched ${emails.length} recent emails from your ${providerName} account.`,
      });
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Fetch Failed",
        description: "Failed to retrieve emails. Please reconnect to your email provider.",
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
      fetchEmails();
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
                
                {!isConnected ? (
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button 
                      className="bg-white text-primary hover:bg-white/90 flex items-center justify-center gap-2 py-6"
                      onClick={() => handleConnectEmail('Gmail')}
                      disabled={isLoading}
                    >
                      {isLoading && provider === 'Gmail' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Mail className="h-5 w-5" />
                      )}
                      Connect Gmail
                    </Button>
                    
                    <Button 
                      className="bg-white text-primary hover:bg-white/90 flex items-center justify-center gap-2 py-6"
                      onClick={() => handleConnectEmail('MockMail')}
                      disabled={isLoading}
                    >
                      {isLoading && provider === 'MockMail' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 8v4l3 3"/></svg>
                      )}
                      Connect MockMail
                    </Button>
                  </div>
                ) : isFetchingEmails ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
                    <p className="mt-4 text-white/80">Fetching your emails...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-white/90">Your {localStorage.getItem('email_provider_name')} account is connected</p>
                      <Button
                        variant="outline"
                        className="mt-2 text-white border-white/20 bg-primary hover:bg-white/70"
                        onClick={fetchEmails}
                        disabled={isFetchingEmails}
                      >
                        Refresh Emails
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
                  </>
                )}
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
        
        {/* Advanced AI Results Section - Updated UI */}
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
                      <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Contextual Email Type</h4>
                      <p className="text-white/90 text-lg">
                        {aiAnalysisResult.contextualType.replace(/^\*\*|\*\*$|^""|""$|:/g, '').trim()}
                      </p>
                    </div>
                    
                    {/* Key Insights */}
                    <div className="p-4 bg-white/10 rounded-lg">
                      <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Key Insights</h4>
                      <ul className="list-disc pl-5 space-y-2 mt-3">
                        {aiAnalysisResult.keyInsights.map((insight: string, idx: number) => (
                          <li key={idx} className="text-white/90">
                            {insight.replace(/^\*\*|\*\*$|^""|""$|:/g, '').trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Sentiment and Urgency */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Sentiment</h4>
                        <div className="flex items-center mt-3">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            aiAnalysisResult.sentimentAnalysis === "Positive" ? "bg-green-400" :
                            aiAnalysisResult.sentimentAnalysis === "Negative" ? "bg-red-400" :
                            aiAnalysisResult.sentimentAnalysis === "Urgent" ? "bg-yellow-400" :
                            "bg-blue-400"
                          }`}></div>
                          <p className={`text-lg font-medium ${
                            aiAnalysisResult.sentimentAnalysis === "Positive" ? "text-green-300" :
                            aiAnalysisResult.sentimentAnalysis === "Negative" ? "text-red-300" :
                            aiAnalysisResult.sentimentAnalysis === "Urgent" ? "text-yellow-300" :
                            "text-white/90"
                          }`}>
                            {aiAnalysisResult.sentimentAnalysis.replace(/^\*\*|\*\*$|^""|""$|:/g, '').trim()}
                          </p>
                        </div>
                        <p className="text-white/70 text-sm mt-2">
                          {aiAnalysisResult.sentimentAnalysis === "Positive" ? "This email conveys positive information or good news." :
                           aiAnalysisResult.sentimentAnalysis === "Negative" ? "This email contains negative information or concerns." :
                           aiAnalysisResult.sentimentAnalysis === "Urgent" ? "This email requires immediate attention." :
                           "This email is informational in nature."}
                        </p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Urgency Level</h4>
                        <div className="mt-3">
                          <div className="w-full bg-white/20 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${
                              aiAnalysisResult.urgencyLevel === "High" ? "bg-red-400 w-full" :
                              aiAnalysisResult.urgencyLevel === "Medium" ? "bg-yellow-400 w-2/3" :
                              "bg-green-400 w-1/3"
                            }`}></div>
                          </div>
                          <p className={`text-lg font-medium mt-2 ${
                            aiAnalysisResult.urgencyLevel === "High" ? "text-red-300" :
                            aiAnalysisResult.urgencyLevel === "Medium" ? "text-yellow-300" :
                            "text-green-300"
                          }`}>
                            {aiAnalysisResult.urgencyLevel.replace(/^\*\*|\*\*$|^""|""$|:/g, '').trim()}
                          </p>
                        </div>
                        <p className="text-white/70 text-sm mt-2">
                          {aiAnalysisResult.urgencyLevel === "High" ? "Requires immediate attention or action." :
                           aiAnalysisResult.urgencyLevel === "Medium" ? "Should be addressed soon but not urgent." :
                           "Can be handled at your convenience."}
                        </p>
                      </div>
                    </div>
                    
                    {/* Shipping Journey Visualization - for shipping emails */}
                    {aiAnalysisResult.contextualType.toLowerCase().includes('shipping') && (
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Shipping Journey</h4>
                        <div className="mt-4">
                          <div className="relative">
                            {/* Shipping Timeline */}
                            <div className="flex items-center justify-between mb-8">
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                </div>
                                <p className="text-white/80 text-xs mt-2">Order Processed</p>
                              </div>
                              <div className="h-1 flex-1 bg-white/20 mx-2">
                                <div className="h-1 bg-green-400 w-full"></div>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                </div>
                                <p className="text-white/80 text-xs mt-2">Shipped</p>
                              </div>
                              <div className="h-1 flex-1 bg-white/20 mx-2">
                                <div className="h-1 bg-green-400 w-1/3"></div>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                </div>
                                <p className="text-white/80 text-xs mt-2">In Transit</p>
                              </div>
                              <div className="h-1 flex-1 bg-white/20 mx-2"></div>
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                </div>
                                <p className="text-white/80 text-xs mt-2">Delivered</p>
                              </div>
                            </div>
                            
                            {/* Shipping Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <div>
                                <p className="text-white/70 text-sm">Carrier:</p>
                                <p className="text-white font-medium">
                                  {aiAnalysisResult.keyInsights.some((i: string) => i.toLowerCase().includes('ups')) ? 'UPS' : 
                                   aiAnalysisResult.keyInsights.some((i: string) => i.toLowerCase().includes('fedex')) ? 'FedEx' :
                                   aiAnalysisResult.keyInsights.some((i: string) => i.toLowerCase().includes('usps')) ? 'USPS' :
                                   'Unknown Carrier'}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/70 text-sm">Tracking Number:</p>
                                <p className="text-white font-medium">
                                  {(() => {
                                    // Extract tracking number from insights
                                    const trackingPattern = /\b([A-Z0-9]{8,22})\b|\btracking\s+(?:number|#)?\s*:?\s*([A-Z0-9]{8,22})\b/i;
                                    for (const insight of aiAnalysisResult.keyInsights) {
                                      const match = insight.match(trackingPattern);
                                      if (match) return match[1] || match[2];
                                    }
                                    return 'Not found';
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/70 text-sm">Estimated Delivery:</p>
                                <p className="text-white font-medium">
                                  {(() => {
                                    // Extract delivery date from insights
                                    const datePattern = /\b(?:delivery|delivered|arrive|arrival|expected)(?:\s+(?:date|on|by))?\s*:?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})/i;
                                    for (const insight of aiAnalysisResult.keyInsights) {
                                      const match = insight.match(datePattern);
                                      if (match) return match[1];
                                    }
                                    return 'Not specified';
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/70 text-sm">Order Total:</p>
                                <p className="text-white font-medium">
                                  {(() => {
                                    // Extract price from insights
                                    const pricePattern = /\$\d+\.\d{2}|\$\d+(?:\.\d{2})?|\d+\.\d{2}\s*(?:USD|EUR|GBP)/i;
                                    for (const insight of aiAnalysisResult.keyInsights) {
                                      const match = insight.match(pricePattern);
                                      if (match) return match[0];
                                    }
                                    return 'Not specified';
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Suggested Actions */}
                    {aiAnalysisResult.suggestedActions && aiAnalysisResult.suggestedActions.length > 0 && (
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Suggested Actions</h4>
                        <ul className="mt-3 space-y-2">
                          {aiAnalysisResult.suggestedActions.map((action: string, idx: number) => (
                            <li key={idx} className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mr-3">
                                <span className="text-white text-xs">{idx + 1}</span>
                              </div>
                              <span className="text-white/90">{action.replace(/^\*\*|\*\*$|^""|""$|:/g, '').trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Entity Recognition */}
                    {aiAnalysisResult.entityRecognition && Object.values(aiAnalysisResult.entityRecognition).some(arr => arr.length > 0) && (
                      <div className="p-4 bg-white/10 rounded-lg">
                        <h4 className="text-white font-medium mb-2 border-b border-white/20 pb-2">Entities Detected:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {Object.entries(aiAnalysisResult.entityRecognition).map(([entityType, entities]: [string, string[]]) => 
                            entities.length > 0 && (
                              <div key={entityType} className="mb-2">
                                <h5 className="text-white/80 capitalize font-medium flex items-center">
                                  {entityType === 'people' && (
                                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                  )}
                                  {entityType === 'organizations' && (
                                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                  )}
                                  {entityType === 'locations' && (
                                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                  )}
                                  {entityType === 'dates' && (
                                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                  )}
                                  {entityType}:
                                </h5>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {entities.map((entity, idx) => (
                                    <span key={idx} className="inline-block px-2 py-1 bg-white/10 rounded text-sm text-white/90">
                                      {entity.replace(/^\*\*|\*\*$|^""|""$/g, '').trim()}
                                    </span>
                                  ))}
                                </div>
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