import { ExportOrder, OrderStage } from '../lib/types';
import { updateDocument, createDocument, getDocuments } from './db';
import { automationService } from './automationService';

export const orderService = {
  /**
   * Updates an order and triggers automations if stage changes
   */
  async updateOrder(id: string, currentOrder: ExportOrder, data: Partial<ExportOrder>) {
    const oldStage = currentOrder.stage;
    const newStage = data.stage;

    await updateDocument('orders', id, data);

    if (newStage && newStage !== oldStage) {
      await automationService.processOrderStageChange(
        { ...currentOrder, ...data }, 
        oldStage, 
        newStage
      );
    }
  },

  /**
   * Creates a new order and triggers initial automations
   */
  async createOrder(data: Partial<ExportOrder>) {
    const id = await createDocument('orders', data);
    const order = { id, ...data } as ExportOrder;
    
    // Initial automations for new orders
    if (order.stage) {
      await automationService.processOrderStageChange(order, 'inquiry' as OrderStage, order.stage);
    }
    
    return id;
  },

  /**
   * Fetches all orders
   */
  async getAllOrders() {
    return getDocuments<ExportOrder>('orders');
  }
};
