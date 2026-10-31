import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductSize, Coupon } from '../types';
import { useStore } from './StoreContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size: ProductSize, color: string, colorHex: string, quantity?: number) => { success: boolean; message?: string };
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  discount: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  shippingOption: 'standard' | 'express';
  setShippingOption: (option: 'standard' | 'express') => void;
  shippingFee: number;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { coupons } = useStore();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('bedtime_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    const saved = localStorage.getItem('bedtime_coupon');
    return saved ? JSON.parse(saved) : null;
  });

  const [shippingOption, setShippingOption] = useState<'standard' | 'express'>('standard');
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('bedtime_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('bedtime_coupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('bedtime_coupon');
    }
  }, [appliedCoupon]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.reduce((sum, item) => {
    const price = item.product.salePrice ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const discount = appliedCoupon
    ? appliedCoupon.type === 'percentage'
      ? (subtotal * appliedCoupon.value) / 100
      : Math.min(subtotal, appliedCoupon.value)
    : 0;

  // Bahrain shipping calculation: Free standard shipping if subtotal >= 25.000 BHD
  const standardFee = subtotal >= 25.000 ? 0.000 : 1.500;
  const shippingFee = shippingOption === 'express' ? 2.500 : standardFee;

  const total = Math.max(0, subtotal - discount + shippingFee);

  const addToCart = (
    product: Product,
    size: ProductSize,
    color: string,
    colorHex: string,
    quantity = 1
  ): { success: boolean; message?: string } => {
    // Find matching variant stock
    const variant = product.variants.find(
      (v) => v.size === size && (v.colorNameEn === color || v.colorNameAr === color)
    );

    const availableStock = variant ? variant.stock : 10;
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.size === size && item.color === color
    );

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + quantity > availableStock) {
        return { success: false, message: `Only ${availableStock} items available in stock.` };
      }
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        )
      );
    } else {
      if (quantity > availableStock) {
        return { success: false, message: `Only ${availableStock} items available in stock.` };
      }
      const newItem: CartItem = {
        id: `cart-${product.id}-${size}-${color}-${Date.now()}`,
        productId: product.id,
        product,
        size,
        color,
        colorHex,
        quantity,
        unitPrice: product.salePrice ?? product.price,
      };
      setCart((prev) => [...prev, newItem]);
    }

    setIsCartOpen(true);
    return { success: true };
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const variant = item.product.variants.find(
            (v) => v.size === item.size && (v.colorNameEn === item.color || v.colorNameAr === item.color)
          );
          const maxStock = variant ? variant.stock : 99;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const trimmed = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === trimmed && c.active);

    if (!found) {
      return { success: false, message: 'Invalid or expired promotional code.' };
    }

    if (subtotal < found.minimumOrder) {
      return {
        success: false,
        message: `This coupon requires a minimum subtotal of ${found.minimumOrder.toFixed(3)} BHD.`,
      };
    }

    setAppliedCoupon(found);
    return { success: true, message: 'Promo coupon applied successfully!' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        subtotal,
        discount,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        shippingOption,
        setShippingOption,
        shippingFee,
        total,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
