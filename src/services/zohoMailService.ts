import { Timestamp } from 'firebase/firestore';
import { EmailMessage } from '../lib/types';

const ZOHO_MAIL_API = 'https://mail.zoho.in/api';

function getAccountId(): string {
  return (import.meta as any).env.VITE_ZOHO_ACCOUNT_ID || '';
}

function getAccessToken(): string {
  return (import.meta as any).env.VITE_ZOHO_ACCESS_TOKEN || '';
}

class ZohoMailService {
  private isConnected: boolean = false;

  async connect(): Promise<boolean> {
    const token = getAccessToken();
    const accountId = getAccountId();
    if (!token || !accountId) {
      console.error('ZohoMail: VITE_ZOHO_ACCESS_TOKEN or VITE_ZOHO_ACCOUNT_ID not set');
      return false;
    }
    try {
      const res = await fetch(`${ZOHO_MAIL_API}/accounts/${accountId}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      const data = await res.json();
      if (data.status?.code !== 200) throw new Error(data.status?.description || 'Failed to connect');
      this.isConnected = true;
      return true;
    } catch (err) {
      console.error('ZohoMail connect error:', err);
      this.isConnected = false;
      return false;
    }
  }

  async sendEmail(email: Omit<EmailMessage, 'id' | 'status' | 'timestamp'>): Promise<EmailMessage> {
    const token = getAccessToken();
    const accountId = getAccountId();
    if (!token || !accountId) {
      // Fallback/Simulated
      return {
        ...email,
        id: `mail_${Math.random().toString(36).substring(2, 11)}`,
        status: 'sent',
        timestamp: Timestamp.now(),
      } as EmailMessage;
    }
    const payload = {
      fromAddress: email.from,
      toAddress: Array.isArray(email.to) ? email.to.join(',') : email.to,
      ccAddress: email.cc ? (Array.isArray(email.cc) ? email.cc.join(',') : email.cc) : '',
      subject: email.subject,
      content: email.body,
      mailFormat: 'html',
    };
    const res = await fetch(`${ZOHO_MAIL_API}/accounts/${accountId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Zoho-oauthtoken ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status?.code !== 200) throw new Error(data.status?.description || 'Failed to send email');
    return {
      ...email,
      id: data.data?.messageId || Date.now().toString(),
      status: 'sent',
      timestamp: Timestamp.now(),
    } as EmailMessage;
  }

  async getEmails(folder: string = 'Inbox'): Promise<EmailMessage[]> {
    const token = getAccessToken();
    const accountId = getAccountId();
    if (!token || !accountId) {
      // Mock emails if not connected, to provide high fidelity UI preview
      return [
        {
          id: '1',
          threadId: 'th_1',
          from: 'buyer@spiceimport.com',
          to: ['sales@calicuttraders.com'],
          subject: 'Inquiry for Premium Green Cardamom',
          body: 'We are looking to source 5 Metric Tons of Grade A Green Cardamom (8mm+). Please share your FOB prices and specifications sheet.',
          timestamp: Timestamp.now(),
          status: 'received',
          organization: 'default'
        },
        {
          id: '2',
          threadId: 'th_2',
          from: 'logistics@maersk.com',
          to: ['operations@calicuttraders.com'],
          subject: 'Booking Confirmation - Vessel Maersk Mc-Kinney Moller',
          body: 'Your container booking for Rotterdam port has been confirmed. ETD Cochin Port is 15th July.',
          timestamp: Timestamp.fromDate(new Date(Date.now() - 3600000 * 4)),
          status: 'received',
          organization: 'default'
        }
      ] as EmailMessage[];
    }
    const res = await fetch(`${ZOHO_MAIL_API}/accounts/${accountId}/messages/view?mailbox=${folder}&limit=50`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await res.json();
    if (data.status?.code !== 200) throw new Error(data.status?.description || 'Failed to fetch emails');
    return (data.data || []).map((msg: Record<string, unknown>) => ({
      id: msg.messageId as string,
      threadId: (msg.threadId as string) || `th_${msg.messageId}`,
      from: msg.fromAddress as string,
      to: Array.isArray(msg.toAddress) ? msg.toAddress : [msg.toAddress as string],
      subject: msg.subject as string,
      body: (msg.content as string) || '',
      status: 'received',
      timestamp: msg.receivedTime ? Timestamp.fromDate(new Date(msg.receivedTime as string)) : Timestamp.now(),
      organization: '',
    } as EmailMessage));
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const zohoMailService = new ZohoMailService();
export default zohoMailService;