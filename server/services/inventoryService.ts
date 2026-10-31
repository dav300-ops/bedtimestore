import { executeQuery, getDatabaseStatus } from '../db';
import {
  SQL_SELECT_ALL_PRODUCTS,
  SQL_SELECT_PRODUCT_BY_ID_OR_SKU,
  SQL_INSERT_PRODUCT,
  SQL_UPDATE_PRODUCT,
  SQL_DELETE_PRODUCT,
  SQL_UPDATE_PRODUCT_VARIANTS,
  SQL_COUNT_PRODUCTS,
} from '../queries/mysqlQueries';
import { INITIAL_PRODUCTS } from '../../src/data/seedData';

export interface ProductInventoryBalance {
  productId: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  categoryNameEn?: string;
  price: number;
  totalUnitsInStock: number;
  totalValueBHD: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  variants: {
    sku: string;
    size: string;
    colorNameEn: string;
    colorHex: string;
    stock: number;
    valueBHD: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  }[];
}

export interface InventoryOverview {
  totalUnits: number;
  totalInventoryValueBHD: number;
  totalProducts: number;
  totalVariants: number;
  lowStockCount: number;
  outOfStockCount: number;
  dbStatus: any;
  productBalances: ProductInventoryBalance[];
}

export class MySQLInventoryService {
  /**
   * Seed default luxury sleepwear catalog into MySQL database if empty
   */
  public async seedIfNeeded(): Promise<void> {
    try {
      const rows = await executeQuery<{ total: number }>(SQL_COUNT_PRODUCTS);
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;

      if (count === 0) {
        console.log('[MySQL] Seeding initial luxury products into MySQL database...');
        for (const p of INITIAL_PRODUCTS) {
          await executeQuery(SQL_INSERT_PRODUCT, [
            p.id,
            p.sku,
            p.nameEn,
            p.nameAr,
            p.descriptionEn,
            p.descriptionAr,
            p.categoryId,
            p.categoryNameEn || '',
            p.categoryNameAr || '',
            Number(p.price),
            p.salePrice !== undefined && p.salePrice !== null ? Number(p.salePrice) : null,
            p.currency || 'BHD',
            JSON.stringify(p.images || []),
            JSON.stringify(p.variants || []),
            p.materialEn || '',
            p.materialAr || '',
            p.careInstructionsEn || '',
            p.careInstructionsAr || '',
            JSON.stringify(p.tags || []),
            p.featured ? 1 : 0,
            p.bestSeller ? 1 : 0,
            p.newArrival ? 1 : 0,
            p.active !== false ? 1 : 0,
            p.rating || 5,
            (p as any).targetAudience || (p.isKids ? 'kids' : 'women'),
            (p as any).kidAgeRange || p.ageGroup || null,
          ]);
        }
        console.log(`[MySQL] Seeded ${INITIAL_PRODUCTS.length} luxury nightwear products to MySQL.`);
      }
    } catch (err: any) {
      console.warn('[MySQL] Product seeding notice:', err?.message);
    }
  }

  /**
   * Get all products from MySQL database
   */
  public async getProducts(): Promise<any[]> {
    try {
      const rows = await executeQuery(SQL_SELECT_ALL_PRODUCTS);
      if (rows && rows.length > 0) {
        return rows.map(this.mapProductRow);
      }
    } catch (err: any) {
      console.warn('[MySQL] Failed to fetch products from MySQL, using initial data:', err?.message);
    }
    return INITIAL_PRODUCTS;
  }

  /**
   * Get single product by id or sku from MySQL
   */
  public async getProductById(idOrSku: string): Promise<any | null> {
    try {
      const rows = await executeQuery(SQL_SELECT_PRODUCT_BY_ID_OR_SKU, [idOrSku, idOrSku]);
      if (rows && rows.length > 0) {
        return this.mapProductRow(rows[0]);
      }
    } catch (err: any) {
      console.warn('[MySQL] Error fetching product by id/sku:', err?.message);
    }
    return INITIAL_PRODUCTS.find((p) => p.id === idOrSku || p.sku === idOrSku) || null;
  }

  /**
   * Add new product to MySQL
   */
  public async addProduct(productData: any): Promise<any> {
    const id = productData.id || `prod-${Date.now()}`;
    const sku = productData.sku || `BDS-${Date.now().toString().slice(-6)}`;

    const newProduct = {
      ...productData,
      id,
      sku,
      price: Number(productData.price || 0),
      salePrice: productData.salePrice !== undefined && productData.salePrice !== null ? Number(productData.salePrice) : null,
      currency: productData.currency || 'BHD',
      images: Array.isArray(productData.images) ? productData.images : [],
      variants: Array.isArray(productData.variants) ? productData.variants : [],
      tags: Array.isArray(productData.tags) ? productData.tags : [],
      featured: Boolean(productData.featured),
      bestSeller: Boolean(productData.bestSeller),
      newArrival: Boolean(productData.newArrival),
      active: productData.active !== false,
      rating: Number(productData.rating || 5),
      reviewCount: Number(productData.reviewCount || 0),
      targetAudience: productData.targetAudience || 'women',
      kidAgeRange: productData.kidAgeRange || null,
    };

    await executeQuery(SQL_INSERT_PRODUCT, [
      newProduct.id,
      newProduct.sku,
      newProduct.nameEn,
      newProduct.nameAr,
      newProduct.descriptionEn || '',
      newProduct.descriptionAr || '',
      newProduct.categoryId,
      newProduct.categoryNameEn || '',
      newProduct.categoryNameAr || '',
      newProduct.price,
      newProduct.salePrice,
      newProduct.currency,
      JSON.stringify(newProduct.images),
      JSON.stringify(newProduct.variants),
      newProduct.materialEn || '',
      newProduct.materialAr || '',
      newProduct.careInstructionsEn || '',
      newProduct.careInstructionsAr || '',
      JSON.stringify(newProduct.tags),
      newProduct.featured ? 1 : 0,
      newProduct.bestSeller ? 1 : 0,
      newProduct.newArrival ? 1 : 0,
      newProduct.active ? 1 : 0,
      newProduct.rating,
      newProduct.reviewCount,
      newProduct.targetAudience,
      newProduct.kidAgeRange,
    ]);

    return (await this.getProductById(id)) || newProduct;
  }

  /**
   * Update product in MySQL
   */
  public async updateProduct(id: string, updates: any): Promise<any> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID ${id} not found in MySQL database`);
    }

    // If only variants are being updated (common in stock operations)
    if (updates.variants && Object.keys(updates).length <= 2) {
      await executeQuery(SQL_UPDATE_PRODUCT_VARIANTS, [JSON.stringify(updates.variants), id]);
      return await this.getProductById(id);
    }

    const merged = {
      sku: updates.sku || existing.sku,
      nameEn: updates.nameEn !== undefined ? updates.nameEn : existing.nameEn,
      nameAr: updates.nameAr !== undefined ? updates.nameAr : existing.nameAr,
      descriptionEn: updates.descriptionEn !== undefined ? updates.descriptionEn : existing.descriptionEn,
      descriptionAr: updates.descriptionAr !== undefined ? updates.descriptionAr : existing.descriptionAr,
      categoryId: updates.categoryId || existing.categoryId,
      categoryNameEn: updates.categoryNameEn || existing.categoryNameEn,
      price: updates.price !== undefined ? Number(updates.price) : existing.price,
      salePrice: updates.salePrice !== undefined ? (updates.salePrice ? Number(updates.salePrice) : null) : existing.salePrice,
      images: updates.images || existing.images,
      variants: updates.variants || existing.variants,
      materialEn: updates.materialEn !== undefined ? updates.materialEn : existing.materialEn,
      materialAr: updates.materialAr !== undefined ? updates.materialAr : existing.materialAr,
      careInstructionsEn: updates.careInstructionsEn !== undefined ? updates.careInstructionsEn : existing.careInstructionsEn,
      careInstructionsAr: updates.careInstructionsAr !== undefined ? updates.careInstructionsAr : existing.careInstructionsAr,
      tags: updates.tags || existing.tags,
      featured: updates.featured !== undefined ? Boolean(updates.featured) : existing.featured,
      bestSeller: updates.bestSeller !== undefined ? Boolean(updates.bestSeller) : existing.bestSeller,
      newArrival: updates.newArrival !== undefined ? Boolean(updates.newArrival) : existing.newArrival,
      active: updates.active !== undefined ? Boolean(updates.active) : existing.active,
      targetAudience: updates.targetAudience || existing.targetAudience,
      kidAgeRange: updates.kidAgeRange || existing.kidAgeRange,
    };

    await executeQuery(SQL_UPDATE_PRODUCT, [
      merged.sku,
      merged.nameEn,
      merged.nameAr,
      merged.descriptionEn,
      merged.descriptionAr,
      merged.categoryId,
      merged.categoryNameEn,
      merged.price,
      merged.salePrice,
      JSON.stringify(merged.images),
      JSON.stringify(merged.variants),
      merged.materialEn,
      merged.materialAr,
      merged.careInstructionsEn,
      merged.careInstructionsAr,
      JSON.stringify(merged.tags),
      merged.featured ? 1 : 0,
      merged.bestSeller ? 1 : 0,
      merged.newArrival ? 1 : 0,
      merged.active ? 1 : 0,
      merged.targetAudience,
      merged.kidAgeRange,
      id,
    ]);

    return (await this.getProductById(id)) || { id, ...merged };
  }

  /**
   * Delete product from MySQL
   */
  public async deleteProduct(id: string): Promise<boolean> {
    await executeQuery(SQL_DELETE_PRODUCT, [id]);
    return true;
  }

  /**
   * Adjust stock for specific variant in MySQL
   */
  public async adjustStock(
    productId: string,
    skuOrSize: string,
    colorHex: string,
    delta: number,
    absoluteNewStock?: number
  ): Promise<any> {
    const product = await this.getProductById(productId);
    if (!product) throw new Error('Product not found in MySQL');

    const updatedVariants = (product.variants || []).map((v: any) => {
      const match =
        (v.sku === skuOrSize || v.size === skuOrSize) &&
        (!colorHex || v.colorHex.toLowerCase() === colorHex.toLowerCase());

      if (match) {
        const newStock =
          typeof absoluteNewStock === 'number'
            ? Math.max(0, absoluteNewStock)
            : Math.max(0, (v.stock || 0) + delta);
        return { ...v, stock: newStock };
      }
      return v;
    });

    await executeQuery(SQL_UPDATE_PRODUCT_VARIANTS, [JSON.stringify(updatedVariants), productId]);
    return await this.getProductById(productId);
  }

  /**
   * Deduct stock when an order is confirmed
   */
  public async deductStock(
    items: { productId: string; size: string; color: string; quantity: number }[]
  ): Promise<{ success: boolean; deductedItems: number }> {
    let deductedCount = 0;

    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (!product) continue;

      const updatedVariants = (product.variants || []).map((v: any) => {
        const sizeMatch = v.size === item.size;
        const colorMatch =
          v.colorNameEn.toLowerCase() === item.color.toLowerCase() ||
          v.colorNameAr === item.color ||
          (v.colorHex && item.color && v.colorHex.toLowerCase() === item.color.toLowerCase());

        if (sizeMatch && colorMatch) {
          const newStock = Math.max(0, (v.stock || 0) - item.quantity);
          deductedCount++;
          return { ...v, stock: newStock };
        }
        return v;
      });

      await executeQuery(SQL_UPDATE_PRODUCT_VARIANTS, [JSON.stringify(updatedVariants), item.productId]);
    }

    return { success: true, deductedItems: deductedCount };
  }

  /**
   * Calculate complete stock balances and inventory metrics from MySQL
   */
  public async getInventoryBalances(): Promise<InventoryOverview> {
    const products = await this.getProducts();

    let totalUnits = 0;
    let totalInventoryValueBHD = 0;
    let totalVariants = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const productBalances: ProductInventoryBalance[] = products.map((p) => {
      let productUnits = 0;
      const variantBalances = (p.variants || []).map((v: any) => {
        const stock = Number(v.stock) || 0;
        productUnits += stock;
        totalUnits += stock;
        totalVariants++;

        const val = stock * Number(p.price || 0);
        totalInventoryValueBHD += val;

        const variantStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' =
          stock === 0 ? 'Out of Stock' : stock <= 4 ? 'Low Stock' : 'In Stock';

        if (stock === 0) outOfStockCount++;
        else if (stock <= 4) lowStockCount++;

        return {
          sku: v.sku || `${p.sku}-${v.size}`,
          size: v.size,
          colorNameEn: v.colorNameEn,
          colorHex: v.colorHex,
          stock,
          valueBHD: Number(val.toFixed(3)),
          status: variantStatus,
        };
      });

      const totalValueBHD = productUnits * Number(p.price || 0);
      const productStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' =
        productUnits === 0 ? 'Out of Stock' : productUnits <= 8 ? 'Low Stock' : 'In Stock';

      return {
        productId: p.id,
        sku: p.sku,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        categoryNameEn: p.categoryNameEn,
        price: p.price,
        totalUnitsInStock: productUnits,
        totalValueBHD: Number(totalValueBHD.toFixed(3)),
        status: productStatus,
        variants: variantBalances,
      };
    });

    return {
      totalUnits,
      totalInventoryValueBHD: Number(totalInventoryValueBHD.toFixed(3)),
      totalProducts: products.length,
      totalVariants,
      lowStockCount,
      outOfStockCount,
      dbStatus: getDatabaseStatus(),
      productBalances,
    };
  }

  /**
   * Helper to parse and map raw MySQL product row
   */
  private mapProductRow(row: any): any {
    const parseJson = (val: any) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    };

    return {
      id: row.id,
      sku: row.sku,
      nameEn: row.nameEn || row.name_en,
      nameAr: row.nameAr || row.name_ar,
      descriptionEn: row.descriptionEn || row.description_en || '',
      descriptionAr: row.descriptionAr || row.description_ar || '',
      categoryId: row.categoryId || row.category_id,
      categoryNameEn: row.categoryNameEn || row.category_name_en,
      categoryNameAr: row.categoryNameAr || row.category_name_ar,
      price: Number(row.price),
      salePrice: row.salePrice !== undefined && row.salePrice !== null ? Number(row.salePrice) : (row.sale_price !== undefined && row.sale_price !== null ? Number(row.sale_price) : undefined),
      currency: row.currency || 'BHD',
      images: parseJson(row.images),
      variants: parseJson(row.variants),
      materialEn: row.materialEn || row.material_en,
      materialAr: row.materialAr || row.material_ar,
      careInstructionsEn: row.careInstructionsEn || row.care_instructions_en,
      careInstructionsAr: row.careInstructionsAr || row.care_instructions_ar,
      tags: parseJson(row.tags),
      featured: Boolean(row.featured),
      bestSeller: Boolean(row.bestSeller !== undefined ? row.bestSeller : row.best_seller),
      newArrival: Boolean(row.newArrival !== undefined ? row.newArrival : row.new_arrival),
      active: row.active !== 0 && row.active !== false,
      rating: Number(row.rating || 5),
      reviewCount: Number(row.reviewCount || row.review_count || 0),
      isKids: (row.targetAudience || row.target_audience) === 'kids' || Boolean(row.isKids),
      ageGroup: row.kidAgeRange || row.kid_age_range || row.ageGroup,
      targetAudience: row.targetAudience || row.target_audience || 'women',
      kidAgeRange: row.kidAgeRange || row.kid_age_range,
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at,
    };
  }
}

export const inventoryService = new MySQLInventoryService();
