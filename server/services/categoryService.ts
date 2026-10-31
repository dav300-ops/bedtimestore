import { executeQuery } from '../db';
import {
  SQL_SELECT_ALL_CATEGORIES,
  SQL_SELECT_CATEGORY_BY_ID_OR_SLUG,
  SQL_INSERT_CATEGORY,
  SQL_UPDATE_CATEGORY,
  SQL_DELETE_CATEGORY,
  SQL_COUNT_CATEGORIES,
} from '../queries/mysqlQueries';
import { INITIAL_CATEGORIES } from '../../src/data/seedData';

export class MySQLCategoryService {
  /**
   * Seed default categories into MySQL database if table is empty
   */
  public async seedIfNeeded(): Promise<void> {
    try {
      const rows = await executeQuery<{ total: number }>(SQL_COUNT_CATEGORIES);
      const count = rows && rows.length > 0 ? Number(rows[0].total) : 0;

      if (count === 0) {
        console.log('[MySQL] Seeding initial luxury categories into MySQL database...');
        for (const cat of INITIAL_CATEGORIES) {
          await executeQuery(SQL_INSERT_CATEGORY, [
            cat.id,
            cat.slug,
            cat.nameEn,
            cat.nameAr,
            cat.descriptionEn || '',
            cat.descriptionAr || '',
            cat.image || '',
            cat.active !== false ? 1 : 0,
            cat.displayOrder || 0,
          ]);
        }
        console.log(`[MySQL] Seeded ${INITIAL_CATEGORIES.length} categories to MySQL database.`);
      }
    } catch (err: any) {
      console.warn('[MySQL] Category seeding notice:', err?.message);
    }
  }

  /**
   * Get all categories sorted by display order
   */
  public async getCategories(): Promise<any[]> {
    try {
      const rows = await executeQuery(SQL_SELECT_ALL_CATEGORIES);
      if (rows && rows.length > 0) {
        return rows.map(this.mapCategoryRow);
      }
    } catch (err: any) {
      console.warn('[MySQL] Failed to fetch categories from MySQL, using initial seed data:', err?.message);
    }
    return INITIAL_CATEGORIES;
  }

  /**
   * Get single category by ID or slug
   */
  public async getCategoryById(idOrSlug: string): Promise<any | null> {
    try {
      const rows = await executeQuery(SQL_SELECT_CATEGORY_BY_ID_OR_SLUG, [idOrSlug, idOrSlug]);
      if (rows && rows.length > 0) {
        return this.mapCategoryRow(rows[0]);
      }
    } catch (err: any) {
      console.warn('[MySQL] Error fetching category by id/slug:', err?.message);
    }
    return INITIAL_CATEGORIES.find((c) => c.id === idOrSlug || c.slug === idOrSlug) || null;
  }

  /**
   * Helper to format slug from English name
   */
  private formatSlug(nameEn: string, rawSlug?: string): string {
    if (rawSlug && rawSlug.trim()) {
      return rawSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    return nameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Add a new category to MySQL database
   */
  public async addCategory(categoryData: any): Promise<any> {
    const slug = this.formatSlug(categoryData.nameEn || '', categoryData.slug);
    const id = categoryData.id || `cat-${slug || Date.now()}`;

    const newCategory = {
      id,
      slug: slug || `cat-${Date.now()}`,
      nameEn: categoryData.nameEn || 'Untitled Category',
      nameAr: categoryData.nameAr || categoryData.nameEn || 'قسم جديد',
      descriptionEn: categoryData.descriptionEn || '',
      descriptionAr: categoryData.descriptionAr || '',
      image: categoryData.image || '',
      active: categoryData.active !== undefined ? Boolean(categoryData.active) : true,
      displayOrder: Number(categoryData.displayOrder ?? 0),
    };

    // First check if it already exists to update or insert
    const existing = await this.getCategoryById(id);
    if (existing) {
      return this.updateCategory(id, newCategory);
    }

    await executeQuery(SQL_INSERT_CATEGORY, [
      newCategory.id,
      newCategory.slug,
      newCategory.nameEn,
      newCategory.nameAr,
      newCategory.descriptionEn,
      newCategory.descriptionAr,
      newCategory.image,
      newCategory.active ? 1 : 0,
      newCategory.displayOrder,
    ]);

    return (await this.getCategoryById(id)) || newCategory;
  }

  /**
   * Update category in MySQL database
   */
  public async updateCategory(id: string, updates: any): Promise<any> {
    const existing = await this.getCategoryById(id);
    if (!existing) {
      throw new Error(`Category with ID ${id} not found in MySQL database`);
    }

    const updatedSlug = updates.slug
      ? this.formatSlug('', updates.slug)
      : updates.nameEn
      ? this.formatSlug(updates.nameEn)
      : existing.slug;

    const merged = {
      nameEn: updates.nameEn !== undefined ? updates.nameEn : existing.nameEn,
      nameAr: updates.nameAr !== undefined ? updates.nameAr : existing.nameAr,
      slug: updatedSlug,
      descriptionEn: updates.descriptionEn !== undefined ? updates.descriptionEn : existing.descriptionEn,
      descriptionAr: updates.descriptionAr !== undefined ? updates.descriptionAr : existing.descriptionAr,
      image: updates.image !== undefined ? updates.image : existing.image,
      active: updates.active !== undefined ? Boolean(updates.active) : existing.active,
      displayOrder: updates.displayOrder !== undefined ? Number(updates.displayOrder) : existing.displayOrder,
    };

    await executeQuery(SQL_UPDATE_CATEGORY, [
      merged.nameEn,
      merged.nameAr,
      merged.slug,
      merged.descriptionEn,
      merged.descriptionAr,
      merged.image,
      merged.active ? 1 : 0,
      merged.displayOrder,
      id,
    ]);

    return (await this.getCategoryById(id)) || { id, ...merged };
  }

  /**
   * Delete category from MySQL database
   */
  public async deleteCategory(id: string): Promise<boolean> {
    await executeQuery(SQL_DELETE_CATEGORY, [id]);
    return true;
  }

  /**
   * Map row to camelCase Category object
   */
  private mapCategoryRow(row: any): any {
    return {
      id: row.id,
      slug: row.slug,
      nameEn: row.nameEn || row.name_en,
      nameAr: row.nameAr || row.name_ar,
      descriptionEn: row.descriptionEn || row.description_en || '',
      descriptionAr: row.descriptionAr || row.description_ar || '',
      image: row.image || '',
      active: row.active !== 0 && row.active !== false,
      displayOrder: Number(row.displayOrder || row.display_order || 0),
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at,
    };
  }
}

export const categoryService = new MySQLCategoryService();
