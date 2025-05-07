
import axios from 'axios';

interface AiParsingResult {
  contextualType: string;
  keyInsights: string[];
  sentimentAnalysis?: string;
  urgencyLevel?: string;
  suggestedActions?: string[];
  entityRecognition?: Record<string, string[]>;
}

export const analyzeEmailWithAI = async (
  emailContent: string,
  apiKey: string
): Promise<AiParsingResult> => {
  try {
    // Check if we have a real API key
    if (apiKey && apiKey.startsWith('gsk_')) {
      // Use GROQ API with the compound-beta model
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'compound-beta',
          messages: [
            {
              role: 'system',
              content: `You are an email analysis expert. Analyze the provided email and extract detailed information.
              
              For ALL emails, provide:
              1. Contextual Type: Identify the specific type of email (e.g., Order Confirmation, Shipping Notification, Marketing, Newsletter, etc.)
              2. Key Insights: Extract 3-5 detailed pieces of information (20-30 words each) including:
                 - For shipping emails: origin location, destination, carrier details, tracking number, estimated delivery date
                 - For order confirmations: order number, items purchased with details, total cost, payment method
                 - For marketing: main offer, expiration date, discount amount, target audience
              3. Sentiment Analysis: Determine if the tone is Positive, Negative, Neutral, or Urgent
              4. Urgency Level: Rate as High, Medium, or Low with explanation
              5. Suggested Actions: Provide 2-3 specific recommended next steps based on the email content
              
              IMPORTANT: Be very specific and detailed in your analysis. Extract actual data from the email, not generic placeholders. If you can't find specific information, say "Not found in email" rather than leaving it blank.
              
              Format your response as a clean JSON object without any markdown formatting like ** or quotes in your values.`
            },
            {
              role: 'user',
              content: emailContent
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Parse the response
      const result = response.data.choices[0].message.content;
      try {
        // Try to parse as JSON
        const parsedResult = JSON.parse(result);
        return {
          contextualType: parsedResult.contextualType || "Unknown",
          keyInsights: Array.isArray(parsedResult.keyInsights) ? parsedResult.keyInsights : [],
          sentimentAnalysis: parsedResult.sentimentAnalysis || "Neutral",
          urgencyLevel: parsedResult.urgencyLevel || "Low",
          suggestedActions: Array.isArray(parsedResult.suggestedActions) ? parsedResult.suggestedActions : [],
          entityRecognition: parsedResult.entityRecognition || { people: [], organizations: [], locations: [], dates: [] }
        };
      } catch (parseError) {
        // If JSON parsing fails, extract information from text
        console.error("Failed to parse AI response as JSON:", parseError);
        return extractInformationFromText(result);
      }
    } else {
      // If no valid API key, use enhanced simulation with more detailed analysis
      return enhancedSimulateAIResponse(emailContent);
    }
  } catch (error) {
    console.error("Error in AI analysis:", error);
    // Fallback to enhanced simulation if API call fails
    return enhancedSimulateAIResponse(emailContent);
  }
};

// Enhanced simulation function with more detailed analysis
const enhancedSimulateAIResponse = (emailContent: string): AiParsingResult => {
  const lowerContent = emailContent.toLowerCase();
  
  // Determine if this is a shipping email
  const isShippingEmail = lowerContent.includes("ship") || 
                          lowerContent.includes("track") || 
                          lowerContent.includes("package") || 
                          lowerContent.includes("delivery") ||
                          lowerContent.includes("ups") ||
                          lowerContent.includes("fedex") ||
                          lowerContent.includes("usps");
  
  // Determine if this is an order confirmation
  const isOrderEmail = lowerContent.includes("order") || 
                       lowerContent.includes("purchase") || 
                       lowerContent.includes("confirmation") || 
                       lowerContent.includes("receipt") ||
                       lowerContent.includes("invoice");
  
  // Extract detailed insights based on email type
  let contextualType = "Unknown";
  let keyInsights: string[] = [];
  
  if (isShippingEmail) {
    contextualType = "Shipping Notification";
    
    // Extract tracking number
    const trackingPattern = /\b([A-Z0-9]{8,22})\b|\btracking\s+(?:number|#)?\s*:?\s*([A-Z0-9]{8,22})\b/i;
    const trackingMatch = emailContent.match(trackingPattern);
    const trackingNumber = trackingMatch ? (trackingMatch[1] || trackingMatch[2]) : "Not found";
    
    // Extract carrier
    let carrier = "Unknown";
    if (lowerContent.includes("ups")) carrier = "UPS";
    else if (lowerContent.includes("fedex")) carrier = "FedEx";
    else if (lowerContent.includes("usps")) carrier = "USPS";
    else if (lowerContent.includes("dhl")) carrier = "DHL";
    
    // Extract delivery date
    const datePattern = /\b(?:delivery|delivered|arrive|arrival|expected)(?:\s+(?:date|on|by))?\s*:?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})/i;
    const dateMatch = emailContent.match(datePattern);
    const deliveryDate = dateMatch ? dateMatch[1] : "Not specified";
    
    // Extract order number
    const orderPattern = /\border\s*(?:number|#)?\s*:?\s*#?\s*([A-Z0-9-]{5,15})/i;
    const orderMatch = emailContent.match(orderPattern);
    const orderNumber = orderMatch ? orderMatch[1] : "Not found";
    
    // Extract price
    const pricePattern = /\$\d+\.\d{2}|\$\d+(?:\.\d{2})?|\d+\.\d{2}\s*(?:USD|EUR|GBP)/i;
    const priceMatch = emailContent.match(pricePattern);
    const price = priceMatch ? priceMatch[0] : "Not specified";
    
    // Extract items
    const itemPattern = /(\d+\s*x\s*[A-Za-z0-9\s-]+)|\b([A-Za-z0-9\s-]+(headphone|cable|charger|phone|laptop|watch|camera)[A-Za-z0-9\s-]*)/i;
    const itemMatch = emailContent.match(itemPattern);
    const item = itemMatch ? itemMatch[0] : "Items not specified";
    
    keyInsights = [
      `Your package is being shipped by ${carrier} with tracking number ${trackingNumber}. Estimated delivery date: ${deliveryDate}.`,
      `Order #${orderNumber} includes ${item}. Total order value: ${price}.`,
      `The package is currently in transit from the warehouse to your delivery address. You will receive a notification when it's out for delivery.`
    ];
  } else if (isOrderEmail) {
    contextualType = "Order Confirmation";
    
    // Extract order number
    const orderPattern = /\border\s*(?:number|#)?\s*:?\s*#?\s*([A-Z0-9-]{5,15})/i;
    const orderMatch = emailContent.match(orderPattern);
    const orderNumber = orderMatch ? orderMatch[1] : "Not found";
    
    // Extract price
    const pricePattern = /\$\d+\.\d{2}|\$\d+(?:\.\d{2})?|\d+\.\d{2}\s*(?:USD|EUR|GBP)/i;
    const priceMatch = emailContent.match(pricePattern);
    const price = priceMatch ? priceMatch[0] : "Not specified";
    
    // Extract items
    const itemPattern = /(\d+\s*x\s*[A-Za-z0-9\s-]+)|\b([A-Za-z0-9\s-]+(headphone|cable|charger|phone|laptop|watch|camera)[A-Za-z0-9\s-]*)/i;
    const itemMatch = emailContent.match(itemPattern);
    const item = itemMatch ? itemMatch[0] : "Items not specified";
    
    // Extract payment method
    const paymentPattern = /\b(visa|mastercard|amex|paypal|credit card|debit card)\b/i;
    const paymentMatch = emailContent.match(paymentPattern);
    const paymentMethod = paymentMatch ? paymentMatch[0] : "Payment method not specified";
    
    keyInsights = [
      `Order #${orderNumber} has been confirmed and is being processed. Your order includes ${item}.`,
      `Total order amount: ${price}, paid via ${paymentMethod}. A receipt has been sent to your email address.`,
      `Your order will be processed within 1-2 business days and you'll receive a shipping confirmation when it ships.`
    ];
  } else {
    // Generic email analysis
    contextualType = "General Communication";
    
    // Extract dates
    const datePattern = /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?,? \d{2,4}\b/gi;
    const dates = emailContent.match(datePattern) || [];
    
    // Extract monetary values
    const moneyPattern = /\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:usd|eur|gbp)/gi;
    const moneyValues = emailContent.match(moneyPattern) || [];
    
    // Extract URLs
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const urls = emailContent.match(urlPattern) || [];
    
    keyInsights = [
      `This appears to be a general communication email with ${dates.length > 0 ? "dates mentioned: " + dates[0] : "no specific dates mentioned"}.`,
      `${moneyValues.length > 0 ? "Financial amounts mentioned: " + moneyValues.join(", ") : "No financial amounts mentioned"} in this communication.`,
      `${urls.length > 0 ? "Contains links: " + urls[0] : "No links found"} in the email content.`
    ];
  }
  
  // Determine sentiment and urgency
  let sentiment = "Neutral";
  let urgency = "Low";
  
  if (lowerContent.includes("urgent") || 
      lowerContent.includes("immediately") || 
      lowerContent.includes("asap")) {
    sentiment = "Urgent";
    urgency = "High";
  } else if (lowerContent.includes("problem") || 
             lowerContent.includes("issue") || 
             lowerContent.includes("concern") ||
             lowerContent.includes("sorry")) {
    sentiment = "Negative";
    urgency = "Medium";
  } else if (lowerContent.includes("thank") || 
             lowerContent.includes("appreciate") || 
             lowerContent.includes("happy") ||
             lowerContent.includes("pleased")) {
    sentiment = "Positive";
    urgency = "Low";
  }
  
  // Generate suggested actions based on email type
  let suggestedActions: string[] = [];
  
  if (isShippingEmail) {
    suggestedActions = [
      "Track your package using the provided tracking number",
      "Mark your calendar for the estimated delivery date",
      "Ensure someone will be available to receive the package"
    ];
  } else if (isOrderEmail) {
    suggestedActions = [
      "Review your order details to ensure everything is correct",
      "Save the order confirmation for your records",
      "Contact customer service if any items are missing or incorrect"
    ];
  } else {
    suggestedActions = [
      "Read the email carefully and note any important information",
      "Respond if a reply is requested or needed",
      "Archive for future reference"
    ];
  }
  
  // Entity recognition
  const entityRecognition = {
    people: [],
    organizations: [],
    locations: [],
    dates: []
  };
  
  // Extract organizations
  const orgPattern = /([A-Z][a-z]*(\s[A-Z][a-z]+)+)\s(Inc\.|Corp\.|LLC|Ltd\.)|(?:Amazon|UPS|FedEx|USPS|DHL|Apple|Microsoft|Google)/g;
  const orgMatches = [...emailContent.matchAll(orgPattern)];
  entityRecognition.organizations = orgMatches.map(match => match[0] || match[3]).filter(Boolean);
  
  // Extract dates
  const dateMatches = emailContent.match(datePattern);
  if (dateMatches) {
    entityRecognition.dates = dateMatches;
  }
  
  return {
    contextualType,
    keyInsights,
    sentimentAnalysis: sentiment,
    urgencyLevel: urgency,
    suggestedActions,
    entityRecognition
  };
};

// Helper function to extract information from text if JSON parsing fails
const extractInformationFromText = (text: string): AiParsingResult => {
  // Default result
  const result: AiParsingResult = {
    contextualType: "General Communication",
    keyInsights: [],
    sentimentAnalysis: "Neutral",
    urgencyLevel: "Low",
    suggestedActions: [],
    entityRecognition: {
      people: [],
      organizations: [],
      locations: [],
      dates: []
    }
  };

  // Try to extract contextual type
  const typeMatch = text.match(/contextual type:?\s*([^.\n]+)/i);
  if (typeMatch && typeMatch[1]) {
    result.contextualType = typeMatch[1].trim();
  }

  // Try to extract key insights
  const insightsSection = text.match(/key insights:?\s*([\s\S]*?)(?:sentiment analysis|urgency level|suggested actions|entity recognition|$)/i);
  if (insightsSection && insightsSection[1]) {
    const insights = insightsSection[1].split(/\n-|\n•|\n\d+\./).filter(Boolean).map(s => s.trim());
    result.keyInsights = insights;
  }

  // Try to extract sentiment
  const sentimentMatch = text.match(/sentiment analysis:?\s*([^.\n]+)/i);
  if (sentimentMatch && sentimentMatch[1]) {
    result.sentimentAnalysis = sentimentMatch[1].trim();
  }

  // Try to extract urgency
  const urgencyMatch = text.match(/urgency level:?\s*([^.\n]+)/i);
  if (urgencyMatch && urgencyMatch[1]) {
    result.urgencyLevel = urgencyMatch[1].trim();
  }

  // Try to extract actions
  const actionsSection = text.match(/suggested actions:?\s*([\s\S]*?)(?:entity recognition|$)/i);
  if (actionsSection && actionsSection[1]) {
    const actions = actionsSection[1].split(/\n-|\n•|\n\d+\./).filter(Boolean).map(s => s.trim());
    result.suggestedActions = actions;
  }

  return result;
};

// Simulated response function (used when no API key is available)
const simulateAIResponse = (emailContent: string): AiParsingResult => {
  // This is the existing simulation code
  return {
    contextualType: detectContextualType(emailContent),
    keyInsights: extractKeyInsights(emailContent),
    sentimentAnalysis: analyzeSentiment(emailContent),
    urgencyLevel: determineUrgency(emailContent),
    suggestedActions: suggestActions(emailContent),
    entityRecognition: recognizeEntities(emailContent)
  };
};

// Helper functions for simulation
const detectContextualType = (content: string): string => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes("ship") || lowerContent.includes("cargo") || lowerContent.includes("delivery")) {
    return "Shipping/Logistics Communication";
  } else if (lowerContent.includes("invoice") || lowerContent.includes("payment")) {
    return "Financial Transaction";
  } else if (lowerContent.includes("meeting") || lowerContent.includes("schedule")) {
    return "Meeting/Calendar Coordination";
  } else if (lowerContent.includes("password") || lowerContent.includes("security") || lowerContent.includes("verification")) {
    return "Account Security";
  } else if (lowerContent.includes("newsletter") || lowerContent.includes("subscribe")) {
    return "Marketing/Newsletter";
  }
  
  return "General Communication";
};

const extractKeyInsights = (content: string): string[] => {
  const insights: string[] = [];
  const datePattern = /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?,? \d{2,4}\b/gi;
  const timePattern = /\b\d{1,2}[:]\d{2}\s*[ap]m\b/gi;
  const moneyPattern = /\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:usd|eur|gbp)/gi;
  const linkPattern = /(https?:\/\/[^\s]+)/gi;
  const trackingPattern = /\b[A-Z0-9]{8,14}\b|\btracking[:\s]+([A-Z0-9]{8,14})\b/gi;
  
  // Find dates
  const dates = content.match(datePattern);
  if (dates) {
    insights.push(`Date mentioned: ${dates[0]}`);
  }
  
  // Find times
  const times = content.match(timePattern);
  if (times) {
    insights.push(`Time mentioned: ${times[0]}`);
  }
  
  // Find monetary values
  const money = content.match(moneyPattern);
  if (money) {
    insights.push(`Financial amount: ${money[0]}`);
  }
  
  // Find tracking numbers
  const tracking = content.match(trackingPattern);
  if (tracking) {
    insights.push(`Possible tracking number: ${tracking[0]}`);
  }
  
  // Find links
  const links = content.match(linkPattern);
  if (links) {
    insights.push(`Contains link to: ${links[0]}`);
  }
  
  return insights.length > 0 ? insights : ["No key insights detected"];
};

const analyzeSentiment = (content: string): string => {
  const positiveTerms = ["thanks", "appreciate", "happy", "glad", "great", "excellent", "good", "pleased"];
  const negativeTerms = ["issue", "problem", "concerned", "disappointed", "delay", "error", "sorry", "mistake"];
  const urgentTerms = ["urgent", "immediately", "asap", "critical", "emergency"];
  
  let positiveCount = 0;
  let negativeCount = 0;
  let urgentCount = 0;
  
  const lowerContent = content.toLowerCase();
  
  positiveTerms.forEach(term => {
    if (lowerContent.includes(term)) positiveCount++;
  });
  
  negativeTerms.forEach(term => {
    if (lowerContent.includes(term)) negativeCount++;
  });
  
  urgentTerms.forEach(term => {
    if (lowerContent.includes(term)) urgentCount++;
  });
  
  if (urgentCount > 0) {
    return "Urgent";
  } else if (positiveCount > negativeCount) {
    return "Positive";
  } else if (negativeCount > positiveCount) {
    return "Negative";
  }
  
  return "Neutral";
};

const determineUrgency = (content: string): string => {
  const lowerContent = content.toLowerCase();
  const urgentTerms = ["urgent", "immediately", "asap", "critical", "emergency", "today", "deadline"];
  
  for (const term of urgentTerms) {
    if (lowerContent.includes(term)) {
      return "High";
    }
  }
  
  const moderateTerms = ["soon", "this week", "follow up", "attention"];
  for (const term of moderateTerms) {
    if (lowerContent.includes(term)) {
      return "Medium";
    }
  }
  
  return "Low";
};

const suggestActions = (content: string): string[] => {
  const actions: string[] = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes("meeting") || lowerContent.includes("call")) {
    actions.push("Schedule in calendar");
  }
  
  if (lowerContent.includes("confirm") || lowerContent.includes("verify")) {
    actions.push("Verify or confirm information");
  }
  
  if (lowerContent.includes("payment") || lowerContent.includes("invoice")) {
    actions.push("Process payment");
  }
  
  if (lowerContent.includes("document") || lowerContent.includes("attach") || lowerContent.includes("file")) {
    actions.push("Review attached documents");
  }
  
  if (lowerContent.includes("deadline") || lowerContent.includes("by") && lowerContent.includes("date")) {
    actions.push("Note deadline");
  }
  
  return actions.length > 0 ? actions : ["No specific actions suggested"];
};

const recognizeEntities = (content: string): Record<string, string[]> => {
  const entities: Record<string, string[]> = {
    people: [],
    organizations: [],
    locations: [],
  };
  
  // Simple regex-based entity extraction (would be much more sophisticated with real NLP)
  // People - looking for Mr./Ms./Dr. followed by capitalized words
  const peoplePattern = /(Mr\.|Ms\.|Mrs\.|Dr\.)\s([A-Z][a-z]+(\s[A-Z][a-z]+)?)/g;
  const peopleMatches = [...content.matchAll(peoplePattern)];
  entities.people = peopleMatches.map(match => match[0]);
  
  // Organization - looking for capitalized words followed by Inc./Corp./LLC
  const orgPattern = /([A-Z][a-z]*(\s[A-Z][a-z]+)+)\s(Inc\.|Corp\.|LLC|Ltd\.)/g;
  const orgMatches = [...content.matchAll(orgPattern)];
  entities.organizations = orgMatches.map(match => match[0]);
  
  // Locations - some common cities/countries (very limited)
  const locations = ["New York", "London", "Tokyo", "Paris", "Berlin", "USA", "UK", "Canada", "Australia"];
  entities.locations = locations.filter(location => content.includes(location));
  
  return entities;
};




