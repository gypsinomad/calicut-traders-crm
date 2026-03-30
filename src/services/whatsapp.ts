import { ExportOrder, Quote } from '../lib/types';

// Opens WhatsApp with pre-filled message
export function sendWhatsAppMessage(phone: string, message: string): void {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encoded}`;
  window.open(url, '_blank');
}

// Builds quote message
export function buildQuoteMessage(quote: Quote): string {
  const itemsSummary = quote.items.map(item => `• ${item.productName}: ${item.quantity} ${item.unit}`).join('\n');
  const validUntil = quote.validUntil.toDate().toLocaleDateString();
  
  return `
Hello ${quote.companyName || 'Valued Customer'},

Please find attached our Proforma Invoice ${quote.quoteNumber} from Global Trade Connect.

Details:
${itemsSummary}
• Total Value: ${quote.currency} ${quote.totalAmount.toLocaleString()}
• Valid Until: ${validUntil}

Kindly confirm your acceptance at the earliest.

Best regards,
Global Trade Connect LLP
Kozhikode, Kerala
  `.trim();
}

// Builds document notification message  
export function buildDocumentMessage(docType: string, orderRef: string, buyerName: string): string {
  return `
Hello ${buyerName},

We have generated the ${docType} for your order ${orderRef}.

Please find the document attached for your review.

Best regards,
Global Trade Connect LLP
  `.trim();
}

/**
 * Simulated WhatsApp Business API Service
 * In a real production environment, this would use Twilio or Meta's Direct API
 */
export const WhatsAppService = {
  /**
   * Send an order confirmation message
   */
  sendOrderConfirmation: async (order: ExportOrder) => {
    console.log(`[WhatsApp] Sending confirmation to ${order.customerName}...`);
    
    // In a real production environment, you would use a template like 'order_confirmation'
    // For now, we'll try to call our server-side API which proxies to Meta
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customerPhone || '919000000000', // Fallback for demo
          templateName: 'order_confirmation',
          languageCode: 'en_US',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: order.orderNumber },
                { type: 'text', text: order.customerName },
                { type: 'text', text: order.commodity },
                { type: 'text', text: `${order.currency} ${order.totalValue.toLocaleString()}` }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('WhatsApp API request failed');
      }

      return await response.json();
    } catch (error) {
      console.warn('[WhatsApp] API call failed, falling back to simulation:', error);
      
      // Fallback simulation for demo purposes
      const message = `
📦 *Order Confirmed!*
Hello *${order.customerName}*, your order has been confirmed.

*Order Details:*
• Order Number: ${order.orderNumber}
• Commodity: ${order.commodity}
• Total Value: ${order.currency} ${order.totalValue.toLocaleString()}

We will notify you once it's shipped. 
- Global Trade Connect LLP
      `.trim();

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        messageId: `wa_sim_${Math.random().toString(36).substr(2, 9)}`,
        content: message
      };
    }
  },

  /**
   * Send a shipment ETA update
   */
  sendShipmentUpdate: async (order: ExportOrder, eta: string) => {
    console.log(`[WhatsApp] Sending ETA update to ${order.customerName}...`);

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customerPhone || '919000000000',
          templateName: 'shipment_update',
          languageCode: 'en_US',
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: order.id },
                { type: 'text', text: eta },
                { type: 'text', text: order.destination }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('WhatsApp API request failed');
      }

      return await response.json();
    } catch (error) {
      console.warn('[WhatsApp] API call failed, falling back to simulation:', error);

      const message = `
🚢 *Shipment Update*
Your order *${order.id}* is on its way!
Estimated Arrival: *${eta}*
Destination: ${order.destination}

Track your shipment here: https://tradetrace.app/track/${order.id}
      `.trim();

      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        success: true,
        messageId: `wa_eta_sim_${Math.random().toString(36).substr(2, 9)}`,
        content: message
      };
    }
  }
};
