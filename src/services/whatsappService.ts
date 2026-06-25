import { Timestamp } from 'firebase/firestore';
import { WhatsAppMessage, WhatsAppTemplate } from '../lib/types';

const WA_API_BASE = 'https://graph.facebook.com/v18.0';

function getPhoneNumberId(): string {
  return (import.meta as any).env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
}

function getAccessToken(): string {
  return (import.meta as any).env.VITE_WHATSAPP_ACCESS_TOKEN || '';
}

class WhatsAppService {
  private isConnected: boolean = false;

  async connect(): Promise<boolean> {
    const phoneNumberId = getPhoneNumberId();
    const token = getAccessToken();
    if (!phoneNumberId || !token) {
      console.error('WhatsApp: VITE_WHATSAPP_PHONE_NUMBER_ID or VITE_WHATSAPP_ACCESS_TOKEN not set');
      return false;
    }
    try {
      const res = await fetch(`${WA_API_BASE}/${phoneNumberId}?access_token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      this.isConnected = true;
      return true;
    } catch (err) {
      console.error('WhatsApp connect error:', err);
      this.isConnected = false;
      return false;
    }
  }

  async getMessages(filters?: { relatedOrderId?: string; relatedLeadId?: string }): Promise<WhatsAppMessage[]> {
    // Return empty array as messages are normally synced from Firestore snapshot in UI, 
    // but the component expects the API surface to exist
    return [];
  }

  async sendMessage(message: Omit<WhatsAppMessage, 'id' | 'timestamp' | 'status'>): Promise<WhatsAppMessage> {
    const phoneNumberId = getPhoneNumberId();
    const token = getAccessToken();
    const bodyContent = message.text || (message as any).content || '';
    if (!phoneNumberId || !token) {
      // Fallback/Simulated
      return {
        ...message,
        text: bodyContent,
        id: `wa_${Math.random().toString(36).substring(2, 11)}`,
        status: 'sent',
        timestamp: Timestamp.now(),
      } as WhatsAppMessage;
    }
    const payload = {
      messaging_product: 'whatsapp',
      to: message.to,
      type: 'text',
      text: { body: bodyContent },
    };
    const res = await fetch(`${WA_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return {
      ...message,
      text: bodyContent,
      id: data.messages?.[0]?.id || Date.now().toString(),
      status: 'sent',
      timestamp: Timestamp.now(),
    } as WhatsAppMessage;
  }

  async sendTemplate(to: string, templateName: string, languageCode: string, components?: unknown[]): Promise<{ messageId: string }> {
    const phoneNumberId = getPhoneNumberId();
    const token = getAccessToken();
    if (!phoneNumberId || !token) {
      return { messageId: `tmpl_${Math.random().toString(36).substring(2, 11)}` };
    }
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    };
    const res = await fetch(`${WA_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { messageId: data.messages?.[0]?.id || '' };
  }

  async getTemplates(): Promise<WhatsAppTemplate[]> {
    const token = getAccessToken();
    const phoneNumberId = getPhoneNumberId();
    if (!token || !phoneNumberId) {
      return [
        {
          id: 'tmpl_1',
          name: 'shipment_dispatch_update',
          category: 'UTILITY',
          language: 'en',
          status: 'APPROVED',
          components: [
            { type: 'HEADER', format: 'TEXT', text: 'Shipment Dispatched' },
            { type: 'BODY', text: 'Your order {{1}} has been shipped. ETA is {{2}}.' }
          ]
        },
        {
          id: 'tmpl_2',
          name: 'payment_received_ack',
          category: 'UTILITY',
          language: 'en',
          status: 'APPROVED',
          components: [
            { type: 'BODY', text: 'We have received payment of {{1}} for invoice {{2}}.' }
          ]
        }
      ] as WhatsAppTemplate[];
    }
    try {
      // Fetch templates using business account
      const res = await fetch(`${WA_API_BASE}/${phoneNumberId}/message_templates?access_token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return (data.data || []) as WhatsAppTemplate[];
    } catch (err) {
      console.error('Error fetching WhatsApp templates:', err);
      return [];
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;