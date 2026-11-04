import { executeQuery } from '../db';
import {
  SQL_INSERT_ORDER,
  SQL_SELECT_ALL_ORDERS,
  SQL_SELECT_ORDERS_BY_USER,
  SQL_UPDATE_ORDER_STATUS,
  SQL_CONFIRM_ORDER_PAYMENT,
} from '../queries/mysqlQueries';
import { INITIAL_ORDERS } from '../data/defaultCatalog';
import { Order, OrderStatus } from '../../src/types';

export class MySQLOrderService {
  /**
   * Seed initial orders into MySQL if empty
   */
  public async seedIfNeeded(): Promise<void> {
    try {
      const rows = await executeQuery<{ total: number }>('SELECT COUNT(*) AS total FROM orders');
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;

      if (count === 0) {
        console.log('[MySQL] Seeding default orders into MySQL database...');
        for (const order of INITIAL_ORDERS) {
          await this.createOrder(order);
        }
        console.log(`[MySQL] Seeded ${INITIAL_ORDERS.length} sample orders.`);
      }
    } catch (err: any) {
      console.warn('[MySQL] Orders seeding notice:', err?.message);
    }
  }

  /**
   * Get all orders dynamically from MySQL
   */
  public async getOrders(): Promise<Order[]> {
    try {
      const rows = await executeQuery<any>(SQL_SELECT_ALL_ORDERS);
      if (rows && Array.isArray(rows)) {
        return rows.map(this.mapOrderRow);
      }
    } catch (err: any) {
      console.warn('[MySQL] Failed to fetch orders from database:', err?.message);
    }
    return [];
  }

  /**
   * Get orders for a specific user ID or email
   */
  public async getOrdersByUser(userId: string, email: string): Promise<Order[]> {
    try {
      const rows = await executeQuery<any>(SQL_SELECT_ORDERS_BY_USER, [userId, email]);
      if (rows && Array.isArray(rows)) {
        return rows.map(this.mapOrderRow);
      }
    } catch (err: any) {
      console.warn('[MySQL] Failed to fetch user orders:', err?.message);
    }
    return [];
  }

  /**
   * Create new order in MySQL
   */
  public async createOrder(order: Order): Promise<Order> {
    const params = [
      order.id,
      order.orderNumber,
      order.userId || null,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      JSON.stringify(order.shippingAddress || {}),
      JSON.stringify(order.items || []),
      order.subtotal,
      order.discount || 0,
      order.shippingFee || 0,
      order.total,
      order.orderStatus || 'Confirmed',
      order.paymentStatus || 'Pending',
      order.paymentMethod,
      order.deliveryVerificationCode || null,
    ];

    await executeQuery(SQL_INSERT_ORDER, params);
    return order;
  }

  /**
   * Update order status in MySQL
   */
  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    try {
      await executeQuery(SQL_UPDATE_ORDER_STATUS, [status, orderId, orderId]);
      return true;
    } catch (err: any) {
      console.warn('[MySQL] Error updating order status:', err?.message);
      return false;
    }
  }

  /**
   * Confirm pay on delivery payment in MySQL
   */
  public async confirmDeliveryPayment(orderId: string): Promise<boolean> {
    try {
      await executeQuery(SQL_CONFIRM_ORDER_PAYMENT, [orderId, orderId]);
      return true;
    } catch (err: any) {
      console.warn('[MySQL] Error confirming order payment:', err?.message);
      return false;
    }
  }

  private mapOrderRow(row: any): Order {
    const parseJson = (val: any) => {
      if (!val) return val;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    };

    return {
      id: row.id,
      orderNumber: row.orderNumber,
      userId: row.userId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      shippingAddress: parseJson(row.deliveryAddress) || {},
      deliveryOption: 'standard',
      shippingFee: Number(row.shippingFee || 0),
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      total: Number(row.total || 0),
      currency: 'BHD',
      paymentMethod: row.paymentMethod,
      paymentTransactionId: row.paymentTransactionId || row.trackingNumber || `TX-${row.orderNumber}`,
      paymentStatus: row.paymentStatus,
      orderStatus: row.orderStatus,
      items: parseJson(row.items) || [],
      deliveryVerificationCode: row.pinCode,
      statusHistory: [
        { status: 'Confirmed', timestamp: row.createdAt || new Date().toISOString() },
        { status: row.orderStatus, timestamp: row.updatedAt || row.createdAt || new Date().toISOString() },
      ],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const orderService = new MySQLOrderService();
