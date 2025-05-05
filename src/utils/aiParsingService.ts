
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
              content: `You are an email analysis expert. Analyze the provided email and extract the following information:
              1. Contextual Type: What type of email is this (e.g., Marketing, Transactional, Personal, etc.)
              2. Key Insights: Extract 3-5 important pieces of information from the email
              3. Sentiment Analysis: Determine if the tone is Positive, Negative, Neutral, or Urgent
              4. Urgency Level: Rate as High, Medium, or Low
              5. Suggested Actions: Provide 2-3 recommended next steps based on the email content
              6. Entity Recognition: Identify people, organizations, locations, dates, and any other entities
              
              Format your response as a JSON object with these keys.`
            },
            {
              role: 'user',
              content: emailContent
            }
          ],
          temperature: 0.2,
          max_tokens: 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Parse the response
      const aiResponse = response.data.choices[0].message.content;
      try {
        // Try to parse as JSON
        const jsonResponse = JSON.parse(aiResponse);
        return {
          contextualType: jsonResponse.contextualType || "Unknown",
          keyInsights: jsonResponse.keyInsights || [],
          sentimentAnalysis: jsonResponse.sentimentAnalysis || "Neutral",
          urgencyLevel: jsonResponse.urgencyLevel || "Low",
          suggestedActions: jsonResponse.suggestedActions || [],
          entityRecognition: jsonResponse.entityRecognition || {}
        };
      } catch (parseError) {
        // If JSON parsing fails, extract information using regex
        console.error("Failed to parse AI response as JSON:", parseError);
        return extractInformationFromText(aiResponse);
      }
    } else {
      // Fallback to simulated response
      console.log("Using simulated response (no valid API key provided)");
      return simulateAIResponse(emailContent);
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error("Failed to analyze email with AI");
  }
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


