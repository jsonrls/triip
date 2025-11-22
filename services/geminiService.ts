import { GoogleGenAI } from "@google/genai";
import { AiRouteInsight, Location } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We cannot use JSON schema with Google Maps tool, so we parse the text manually.
const parseInsightFromText = (text: string): Partial<AiRouteInsight> => {
  const fareMatch = text.match(/Fare:\s*₱?([\d]+)/i);
  const distanceMatch = text.match(/Distance:\s*([\d.]+)\s*km/i);
  
  return {
    estimatedFare: fareMatch ? parseInt(fareMatch[1]) : 40,
    distanceLabel: distanceMatch ? `${distanceMatch[1]} km` : "Unknown distance",
    // We use the full text as the tip/summary
    trafficTip: "Real-time data",
    safetyTip: "Verify route"
  };
};

export const getRouteInsight = async (destination: string, userLocation?: Location): Promise<AiRouteInsight> => {
  try {
    // Default location if geolocation fails (Manila coordinates)
    const locationConfig = userLocation ? {
      retrievalConfig: {
        latLng: {
          latitude: userLocation.lat,
          longitude: userLocation.lng
        }
      }
    } : undefined;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `I am currently at ${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : 'an unknown location'}.
      I want to go to "${destination}" by tricycle.
      
      Using Google Maps, find the best route and traffic conditions.
      Then, estimate a fair tricycle fare based on distance (Base: 20 PHP + 10 PHP/km).
      
      Strictly format your response like this:
      Fare: [Amount in PHP only digits]
      Distance: [Distance in km only digits] km
      Summary: [A helpful, friendly summary of the route and traffic in 2 sentences]
      
      Make sure to be specific about the location found.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: locationConfig,
        systemInstruction: "You are a helpful local transport assistant for tricycle drivers and commuters in the Philippines. Always use real-time map data.",
      },
    });

    const text = response.text || "";
    const parsed = parseInsightFromText(text);
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    // Extract summary from text (everything after the formatted lines if possible, or just the whole text if regex fails)
    const summaryLine = text.match(/Summary:\s*(.+)/is);
    const cleanSummary = summaryLine ? summaryLine[1] : text;

    return {
      estimatedFare: parsed.estimatedFare || 50,
      distanceLabel: parsed.distanceLabel || "Calculating...",
      trafficTip: cleanSummary.slice(0, 60) + "...", // Short tip for the badge
      safetyTip: "Maps Data Verified",
      fullSummary: cleanSummary,
      groundingMetadata: groundingMetadata as any
    };

  } catch (error) {
    console.error("Gemini Route Insight Error:", error);
    // Fallback
    return {
      estimatedFare: 40,
      distanceLabel: "2.0 km",
      trafficTip: "Standard route (Offline)",
      safetyTip: "Always hold onto the handrail.",
      fullSummary: "Could not connect to Maps. Using standard estimation."
    };
  }
};