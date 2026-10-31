import { executeQuery } from '../db';
import {
  SQL_INSERT_PRODUCT_SALE,
  SQL_SELECT_ALL_PRODUCT_SALES,
  SQL_SELECT_SALES_BY_PRODUCT,
  SQL_SELECT_SALES_BY_ORDER,
  SQL_SELECT_TOP_SELLING_PRODUCTS,
  SQL_SELECT_SALES_BY_CATEGORY,
  SQL_SELECT_SALES_BY_PAYMENT_METHOD,
  SQL_SELECT_SALES_BY_BAHRAIN_AREA,
  SQL_SELECT_DAILY_SALES_TREND,
  SQL_SELECT_SALES_OVERALL_SUMMARY,
  SQL_COUNT_PRODUCT_SALES,
} from '../queries/mysqlQueries';
import { INITIAL_ORDERS, INITIAL_PRODUCTS } from '../data/defaultCatalog';

export interface ProductSaleRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productSku: string;
  productNameEn: string;
  productNameAr: string;
  categoryId?: string;
  categoryNameEn?: string;
  variantSize?: string;
  variantColorName?: string;
  variantColorHex?: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus?: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerArea?: string;
  customerCity?: string;
  saleDate: string;
  createdAt?: string;
}

export class MySQLSalesService {
  /**
   * Seed Initial Historical Product Sales from Seed Orders into MySQL
   */
  public async seedInitialSalesIfNeeded(): Promise<void> {
    try {
      const rows = await executeQuery<{ total: number }>(SQL_COUNT_PRODUCT_SALES);
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;

      if (count === 0) {
        console.log('[MySQL] Seeding initial historical product sales records...');
        for (const order of INITIAL_ORDERS) {
          await this.recordOrderSales({
            id: order.id,
            orderNumber: order.orderNumber,
            userId: order.userId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            deliveryAddress: order.shippingAddress,
            items: (order.items || []).map((it) => {
              const matchedProd = INITIAL_PRODUCTS.find((p) => p.id === it.productId);
              return {
                productId: it.productId,
                productSku: matchedProd?.sku || `SKU-${it.productId}`,
                productNameEn: matchedProd?.nameEn || 'Luxury Nightwear Item',
                productNameAr: matchedProd?.nameAr || 'قطعة ملابس نوم فاخرة',
                categoryId: matchedProd?.categoryId || 'cat-nightwear',
                categoryNameEn: matchedProd?.categoryNameEn || 'Nightwear',
                size: it.size,
                colorName: it.color,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                totalAmount: it.totalPrice ?? (it.unitPrice * it.quantity),
              };
            }),
          });
        }
        console.log('[MySQL] Seeded initial product sales transactions into MySQL.');
      }
    } catch (err: any) {
      console.warn('[MySQL] Sales seeding notice:', err?.message);
    }
  }

  /**
   * Record all product line-item sales from an order into MySQL
   */
  public async recordOrderSales(orderData: {
    id: string;
    orderNumber: string;
    userId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    paymentMethod?: string;
    paymentStatus?: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
    deliveryAddress?: {
      area?: string;
      city?: string;
    };
    items: Array<{
      productId: string;
      productSku?: string;
      productNameEn?: string;
      productNameAr?: string;
      categoryId?: string;
      categoryNameEn?: string;
      size?: string;
      colorName?: string;
      colorHex?: string;
      unitPrice: number;
      quantity: number;
      totalAmount?: number;
    }>;
  }): Promise<{ success: boolean; recordedSalesCount: number; sales: ProductSaleRecord[] }> {
    const recordedSales: ProductSaleRecord[] = [];

    for (let i = 0; i < orderData.items.length; i++) {
      const item = orderData.items[i];
      const saleId = `sale-${orderData.orderNumber}-${i + 1}-${Date.now().toString().slice(-4)}`;
      const totalAmount = item.totalAmount ?? Number((item.unitPrice * item.quantity).toFixed(3));

      const saleRecord: ProductSaleRecord = {
        id: saleId,
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        productId: item.productId,
        productSku: item.productSku || `BDS-${item.productId}`,
        productNameEn: item.productNameEn || 'Luxury Nightwear Garment',
        productNameAr: item.productNameAr || 'ملابس نوم فاخرة',
        categoryId: item.categoryId || 'cat-silk-nightwear',
        categoryNameEn: item.categoryNameEn || 'Nightwear',
        variantSize: item.size || 'M',
        variantColorName: item.colorName || 'Default',
        variantColorHex: item.colorHex || '#340404',
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        totalAmount,
        currency: 'BHD',
        paymentMethod: orderData.paymentMethod || 'benefit_pay',
        paymentStatus: orderData.paymentStatus || 'Paid',
        customerId: orderData.userId,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerArea: orderData.deliveryAddress?.area || 'Adliya',
        customerCity: orderData.deliveryAddress?.city || 'Manama',
        saleDate: new Date().toISOString().split('T')[0],
      };

      await executeQuery(SQL_INSERT_PRODUCT_SALE, [
        saleRecord.id,
        saleRecord.orderId,
        saleRecord.orderNumber,
        saleRecord.productId,
        saleRecord.productSku,
        saleRecord.productNameEn,
        saleRecord.productNameAr,
        saleRecord.categoryId,
        saleRecord.categoryNameEn,
        saleRecord.variantSize,
        saleRecord.variantColorName,
        saleRecord.variantColorHex,
        saleRecord.unitPrice,
        saleRecord.quantity,
        saleRecord.totalAmount,
        saleRecord.currency,
        saleRecord.paymentMethod,
        saleRecord.paymentStatus,
        saleRecord.customerId,
        saleRecord.customerName,
        saleRecord.customerEmail,
        saleRecord.customerArea,
        saleRecord.customerCity,
      ]);

      recordedSales.push(saleRecord);
    }

    return {
      success: true,
      recordedSalesCount: recordedSales.length,
      sales: recordedSales,
    };
  }

  /**
   * Get all product sales transactions (paginated)
   */
  public async getAllSales(limit = 50, offset = 0): Promise<ProductSaleRecord[]> {
    const rows = await executeQuery(SQL_SELECT_ALL_PRODUCT_SALES, [limit, offset]);
    return rows;
  }

  /**
   * Get product sales analytics and aggregations
   */
  public async getSalesAnalytics(topLimit = 8): Promise<{
    summary: any;
    topProducts: any[];
    salesByCategory: any[];
    salesByPaymentMethod: any[];
    salesByRegion: any[];
    dailyTrend: any[];
  }> {
    const [summaryRows, topProducts, salesByCategory, salesByPaymentMethod, salesByRegion, dailyTrend] =
      await Promise.all([
        executeQuery(SQL_SELECT_SALES_OVERALL_SUMMARY),
        executeQuery(SQL_SELECT_TOP_SELLING_PRODUCTS, [topLimit]),
        executeQuery(SQL_SELECT_SALES_BY_CATEGORY),
        executeQuery(SQL_SELECT_SALES_BY_PAYMENT_METHOD),
        executeQuery(SQL_SELECT_SALES_BY_BAHRAIN_AREA),
        executeQuery(SQL_SELECT_DAILY_SALES_TREND),
      ]);

    const summary = summaryRows && summaryRows.length > 0 ? summaryRows[0] : {
      totalSaleItems: 0,
      totalOrders: 0,
      distinctProductsSold: 0,
      totalUnitsSold: 0,
      grossRevenueBHD: 0,
      averageItemValueBHD: 0,
    };

    return {
      summary,
      topProducts,
      salesByCategory,
      salesByPaymentMethod,
      salesByRegion,
      dailyTrend,
    };
  }

  /**
   * Get sales by specific product
   */
  public async getSalesByProduct(productIdOrSku: string): Promise<ProductSaleRecord[]> {
    return await executeQuery(SQL_SELECT_SALES_BY_PRODUCT, [productIdOrSku, productIdOrSku]);
  }

  /**
   * Get sales for a specific order
   */
  public async getSalesByOrder(orderIdOrNumber: string): Promise<ProductSaleRecord[]> {
    return await executeQuery(SQL_SELECT_SALES_BY_ORDER, [orderIdOrNumber, orderIdOrNumber]);
  }
}

export const salesService = new MySQLSalesService();
