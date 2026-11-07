import { executeQuery, withTransaction, sanitizeParams, stringifyJson, parseJson } from '../db';
import {
  SQL_INSERT_ORDER,
  SQL_SELECT_ALL_ORDERS,
  SQL_SELECT_ORDER_BY_ID,
  SQL_SELECT_ORDERS_BY_USER,
  SQL_UPDATE_ORDER,
  SQL_UPDATE_ORDER_STATUS,
  SQL_CONFIRM_ORDER_PAYMENT,
  SQL_DELETE_ORDER,
  SQL_INSERT_PRODUCT_SALE,
  SQL_UPDATE_PRODUCT_VARIANTS,
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
   * Get single order by ID or order number
   */
  public async getOrderById(idOrNumber: string): Promise<Order | null> {
    try {
      const rows = await executeQuery<any>(SQL_SELECT_ORDER_BY_ID, [idOrNumber, idOrNumber]);
      if (rows && rows.length > 0) {
        return this.mapOrderRow(rows[0]);
      }
    } catch (err: any) {
      console.warn('[MySQL] Error fetching order by ID/number:', err?.message);
    }
    return null;
  }

  /**
   * Create new order in MariaDB/MySQL with ACID transaction:
   * 1. Insert order record
   * 2. Insert line items into product_sales table
   * 3. Decrement variant stock on products table
   */
  public async createOrder(orderData: any): Promise<Order> {
    const id = orderData.id || `ord-${Date.now()}`;
    const orderNumber = orderData.orderNumber || `BDS-${Date.now().toString().slice(-6)}`;
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const shippingAddress = orderData.shippingAddress || orderData.deliveryAddress || {};
    const subtotal = Number(orderData.subtotal || 0);
    const discount = Number(orderData.discount || 0);
    const shippingFee = Number(orderData.shippingFee || 0);
    const total = Number(orderData.total || (subtotal - discount + shippingFee));
    const orderStatus = orderData.orderStatus || orderData.order_status || 'Confirmed';
    const paymentStatus = orderData.paymentStatus || orderData.payment_status || 'Pending';
    const paymentMethod = orderData.paymentMethod || orderData.payment_method || 'BenefitPay';
    const pinCode = orderData.pinCode || orderData.pin_code || orderData.deliveryVerificationCode || null;

    const orderParams = [
      id,
      orderNumber,
      orderData.userId || null,
      orderData.customerName,
      orderData.customerEmail,
      orderData.customerPhone,
      stringifyJson(shippingAddress, {}),
      stringifyJson(items, []),
      subtotal,
      discount,
      shippingFee,
      total,
      orderStatus,
      paymentStatus,
      paymentMethod,
      pinCode,
    ];

    // Execute within transaction
    await withTransaction(async (conn) => {
      // 1. Insert into orders table
      if (conn) {
        await conn.execute(SQL_INSERT_ORDER, sanitizeParams(orderParams));

        // 2. Insert line items into product_sales
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          const saleId = `sale-${Date.now()}-${idx}`;
          const saleParams = [
            saleId,
            id,
            orderNumber,
            item.productId || `prod-${idx}`,
            item.sku || `SKU-${idx}`,
            item.nameEn || item.name || 'Sleepwear Item',
            item.nameAr || item.name || 'ملابس نوم',
            item.categoryId || null,
            item.categoryNameEn || null,
            item.size || null,
            item.color || item.colorName || null,
            item.colorHex || null,
            Number(item.price || 0),
            Number(item.quantity || 1),
            Number((item.price || 0) * (item.quantity || 1)),
            'BHD',
            paymentMethod,
            paymentStatus === 'Paid' ? 'Paid' : 'Pending',
            orderData.userId || null,
            orderData.customerName || null,
            orderData.customerEmail || null,
            shippingAddress.area || null,
            shippingAddress.city || 'Manama',
          ];
          await conn.execute(SQL_INSERT_PRODUCT_SALE, sanitizeParams(saleParams));

          // 3. Update variant stock on products table
          if (item.productId) {
            try {
              const [prodRows]: any = await conn.execute(
                'SELECT variants FROM products WHERE id = ?',
                [item.productId]
              );
              if (prodRows && prodRows.length > 0) {
                const variants = parseJson(prodRows[0].variants, []);
                const updatedVariants = variants.map((v: any) => {
                  const matches =
                    (v.size && item.size && v.size.toLowerCase() === item.size.toLowerCase()) ||
                    (v.sku && item.sku && v.sku === item.sku);
                  if (matches) {
                    return {
                      ...v,
                      stock: Math.max(0, (Number(v.stock) || 0) - (Number(item.quantity) || 1)),
                    };
                  }
                  return v;
                });
                await conn.execute(SQL_UPDATE_PRODUCT_VARIANTS, [
                  stringifyJson(updatedVariants, []),
                  item.productId,
                ]);
              }
            } catch (stockErr: any) {
              console.warn('[MySQL] Variant stock deduction notice:', stockErr?.message);
            }
          }
        }
      } else {
        // Fallback execution via universal executeQuery
        await executeQuery(SQL_INSERT_ORDER, orderParams);
      }
    });

    const created = await this.getOrderById(id);
    return (
      created || {
        id,
        orderNumber,
        userId: orderData.userId,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        shippingAddress,
        deliveryOption: 'standard',
        shippingFee,
        subtotal,
        discount,
        total,
        currency: 'BHD',
        paymentMethod,
        paymentTransactionId: `TX-${orderNumber}`,
        paymentStatus,
        orderStatus,
        items,
        deliveryVerificationCode: pinCode,
        statusHistory: [
          {
            status: orderStatus as any,
            timestamp: new Date().toISOString(),
            note: 'Order placed and written to MariaDB',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Order
    );
  }

  /**
   * Update order in MariaDB/MySQL
   */
  public async updateOrder(id: string, updates: any): Promise<Order | null> {
    const existing = await this.getOrderById(id);
    if (!existing) {
      throw new Error(`Order with ID ${id} not found in database`);
    }

    const merged = {
      customerName: updates.customerName !== undefined ? updates.customerName : existing.customerName,
      customerEmail: updates.customerEmail !== undefined ? updates.customerEmail : existing.customerEmail,
      customerPhone: updates.customerPhone !== undefined ? updates.customerPhone : existing.customerPhone,
      deliveryAddress: stringifyJson(updates.shippingAddress || updates.deliveryAddress || existing.shippingAddress),
      items: stringifyJson(updates.items || existing.items),
      subtotal: updates.subtotal !== undefined ? Number(updates.subtotal) : existing.subtotal,
      discount: updates.discount !== undefined ? Number(updates.discount) : existing.discount,
      shippingFee: updates.shippingFee !== undefined ? Number(updates.shippingFee) : existing.shippingFee,
      total: updates.total !== undefined ? Number(updates.total) : existing.total,
      orderStatus: updates.orderStatus || updates.order_status || existing.orderStatus,
      paymentStatus: updates.paymentStatus || updates.payment_status || existing.paymentStatus,
      paymentMethod: updates.paymentMethod || updates.payment_method || existing.paymentMethod,
      pinCode: updates.pinCode || updates.pin_code || updates.deliveryVerificationCode || existing.deliveryVerificationCode || null,
      trackingNumber: updates.trackingNumber || updates.tracking_number || existing.paymentTransactionId || null,
    };

    await executeQuery(SQL_UPDATE_ORDER, [
      merged.customerName,
      merged.customerEmail,
      merged.customerPhone,
      merged.deliveryAddress,
      merged.items,
      merged.subtotal,
      merged.discount,
      merged.shippingFee,
      merged.total,
      merged.orderStatus,
      merged.paymentStatus,
      merged.paymentMethod,
      merged.pinCode,
      merged.trackingNumber,
      id,
    ]);

    return await this.getOrderById(id);
  }

  /**
   * Delete order from MariaDB/MySQL
   */
  public async deleteOrder(id: string): Promise<boolean> {
    await executeQuery(SQL_DELETE_ORDER, [id]);
    return true;
  }

  /**
   * Update order status in MySQL
   */
  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    await executeQuery(SQL_UPDATE_ORDER_STATUS, [status, orderId, orderId]);
    return true;
  }

  /**
   * Confirm pay on delivery payment in MySQL
   */
  public async confirmDeliveryPayment(orderId: string): Promise<boolean> {
    await executeQuery(SQL_CONFIRM_ORDER_PAYMENT, [orderId, orderId]);
    return true;
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
