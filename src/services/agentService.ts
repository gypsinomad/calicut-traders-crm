import { generateAIContent } from '../lib/ai';
import { 
  ExportOrder, 
  UnifiedMessage, 
  MarketSignal, 
  Notification,
  Task,
  Lead
} from '../lib/types';
import { 
  createDocument, 
  getDocuments, 
  updateDocument,
  getDocument
} from './db';
import { Timestamp } from 'firebase/firestore';
import { automationService } from './automationService';

/**
 * AI Agent Service - Orchestrates specialized agents for trade operations
 */
export const agentService = {
  
  /**
   * 1. Logistics & Operations Agent
   * Monitors shipment health and automates proactive communication
   */
  async runLogisticsAgent(order: ExportOrder) {
    try {
      // Analyze shipment status and potential risks
      const prompt = `
        Analyze this export order for potential logistics risks or delays.
        Order: ${JSON.stringify(order)}
        Current Date: ${new Date().toISOString()}
        
        Provide a JSON response with:
        1. riskLevel: 'low' | 'medium' | 'high'
        2. riskReason: string
        3. recommendedAction: string
        4. draftBuyerMessage: string (A proactive message to the buyer if risk is medium/high)
      `;

      const response = await generateAIContent('logistics_agent', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const analysis = JSON.parse(response.text);

      if (analysis.riskLevel !== 'low') {
        // Create a risk alert notification
        await automationService.createNotification(
          order.assignedUserId,
          `Logistics Risk: ${order.orderNumber}`,
          `${analysis.riskReason}. Recommended: ${analysis.recommendedAction}`,
          analysis.riskLevel === 'high' ? 'error' : 'warning',
          order.id,
          'order',
          order.organization
        );

        // If high risk, create an urgent task
        if (analysis.riskLevel === 'high') {
          await createDocument('tasks', {
            title: `Mitigate Delay: ${order.orderNumber}`,
            description: analysis.recommendedAction,
            status: 'open',
            priority: 'high',
            dueDate: Timestamp.now(),
            relatedOrderId: order.id,
            organization: order.organization
          });
        }
      }

      return analysis;
    } catch (error) {
      console.error('Logistics Agent Error:', error);
    }
  },

  /**
   * 2. Communication & Relationship Agent
   * Triages messages, analyzes sentiment, and drafts context-aware replies
   */
  async runCommunicationAgent(message: UnifiedMessage) {
    try {
      const prompt = `
        Analyze this incoming trade message and provide triaging data.
        Message: ${JSON.stringify(message)}
        
        Provide a JSON response with:
        1. sentiment: 'positive' | 'neutral' | 'negative'
        2. priority: 'urgent' | 'normal' | 'low'
        3. category: 'payment' | 'shipping' | 'quality' | 'inquiry' | 'other'
        4. draftReply: string (Professional reply in the context of global trade)
        5. suggestedLabel: string
      `;

      const response = await generateAIContent('comm_agent', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const analysis = JSON.parse(response.text);

      // Update message with AI insights
      await updateDocument('messages', message.id, {
        aiInsights: {
          sentiment: analysis.sentiment,
          priority: analysis.priority === 'urgent' ? 'urgent' : analysis.priority,
          category: analysis.category,
          suggestedReply: analysis.draftReply,
          lastAnalyzed: Timestamp.now()
        },
        status: analysis.priority === 'urgent' ? 'pending' : message.status
      });

      // If urgent payment query, notify finance/admin
      if (analysis.category === 'payment' && analysis.priority === 'urgent') {
        await automationService.createNotification(
          'admin',
          'Urgent Payment Inquiry',
          `From ${message.sender.name}: ${message.content.substring(0, 50)}...`,
          'error',
          message.id,
          'message',
          message.organization
        );
      }

      return analysis;
    } catch (error) {
      console.error('Communication Agent Error:', error);
    }
  },

  /**
   * 3. Market Intelligence Agent
   * Analyzes market signals and generates proactive alerts
   */
  async runMarketIntelligenceAgent(organization: string) {
    try {
      // Fetch recent market signals and commodity data
      const signals = await getDocuments<MarketSignal>('marketSignals', [
        { field: 'organization', operator: '==', value: organization }
      ]);

      const prompt = `
        Analyze these market signals for a global trade business.
        Signals: ${JSON.stringify(signals)}
        
        Identify the most critical trend and provide a JSON response with:
        1. trendTitle: string
        2. impact: 'positive' | 'negative' | 'neutral'
        3. confidence: number (0-1)
        4. summary: string
        5. recommendedAction: string
        6. targetCommodity: string
      `;

      const response = await generateAIContent('market_agent', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const analysis = JSON.parse(response.text);

      // Create a proactive market alert
      if (analysis.confidence > 0.7) {
        await automationService.createNotification(
          'all', // Broadcast to relevant users
          `Market Alert: ${analysis.trendTitle}`,
          `${analysis.summary}. Action: ${analysis.recommendedAction}`,
          analysis.impact === 'negative' ? 'error' : 'success',
          undefined,
          'market',
          organization
        );
      }

      return analysis;
    } catch (error) {
      console.error('Market Intelligence Agent Error:', error);
    }
  },

  /**
   * 4. Compliance & Risk Agent
   * Audits documents and assesses trade risk
   */
  async runComplianceAgent(order: ExportOrder) {
    try {
      const prompt = `
        Perform a compliance and risk audit on this export order.
        Order: ${JSON.stringify(order)}
        
        Check for:
        - Missing mandatory documents for ${order.commodity}
        - Supplier risk based on historical data
        - Trade regulation compliance
        
        Provide a JSON response with:
        1. complianceScore: number (0-100)
        2. risks: string[]
        3. missingItems: string[]
        4. status: 'approved' | 'flagged' | 'rejected'
        5. auditorNotes: string
      `;

      const response = await generateAIContent('compliance_agent', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const audit = JSON.parse(response.text);

      // Update order with compliance status
      await updateDocument('orders', order.id, {
        complianceStatus: audit.status,
        complianceScore: audit.complianceScore,
        complianceNotes: audit.auditorNotes,
        updatedAt: Timestamp.now()
      });

      if (audit.status !== 'approved') {
        await automationService.createNotification(
          order.assignedUserId,
          `Compliance Flag: ${order.orderNumber}`,
          `Status: ${audit.status}. ${audit.risks[0] || 'Check auditor notes.'}`,
          audit.status === 'rejected' ? 'error' : 'warning',
          order.id,
          'order',
          order.organization
        );
      }

      return audit;
    } catch (error) {
      console.error('Compliance Agent Error:', error);
    }
  },

  /**
   * Lead Scoring Agent
   * Analyzes leads and assigns scores based on conversion probability
   */
  async runLeadScoringAgent(lead: Lead) {
    try {
      const prompt = `
        Score this trade lead based on conversion probability.
        Lead: ${JSON.stringify(lead)}
        
        Provide a JSON response with:
        1. score: number (0-100)
        2. temperature: 'hot' | 'warm' | 'cold'
        3. keyStrengths: string[]
        4. concerns: string[]
        5. recommendedNextStep: string
      `;

      const response = await generateAIContent('lead_scoring_agent', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const scoring = JSON.parse(response.text);

      await updateDocument('leads', lead.id, {
        score: scoring.score,
        status: scoring.temperature === 'hot' ? 'qualified' : lead.status,
        aiInsights: {
          temperature: scoring.temperature,
          strengths: scoring.keyStrengths,
          concerns: scoring.concerns,
          nextStep: scoring.recommendedNextStep,
          scoredAt: Timestamp.now()
        }
      });

      return scoring;
    } catch (error) {
      console.error('Lead Scoring Agent Error:', error);
    }
  }
};
