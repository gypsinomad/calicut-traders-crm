import { generateAIContent } from "../lib/ai";

export async function generateComplianceInsights(order: any) {
  try {
    const response = await generateAIContent('Compliance Insights', {
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze the following export order for compliance risks and logistics optimization.
          Order Details: ${JSON.stringify(order)}
          Provide a concise summary of risks and 2-3 optimization tips.`
        }]
      }]
    });
    
    return response.text || "No insights generated.";
  } catch (error) {
    console.error('AI Insight Error:', error);
    return "Unable to generate insights at this time.";
  }
}

export async function generateBuyerFollowUp(buyer: any) {
  try {
    const response = await generateAIContent('Buyer Follow-up', {
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `Generate a personalized follow-up message for this buyer based on their history.
          Buyer Profile: ${JSON.stringify(buyer)}
          The message should be professional, warm, and encourage a new order of their preferred products.`
        }]
      }]
    });

    return response.text || "No message generated.";
  } catch (error) {
    console.error('AI Follow-up Error:', error);
    return "Unable to generate follow-up message.";
  }
}
