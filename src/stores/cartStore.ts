import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MerchItem } from '../db/schema';

export interface CartItem extends MerchItem {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addToCart: (item: MerchItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  
  // These are computed in components directly
  total: number;
  itemCount: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addToCart: (product: MerchItem) => {
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              isOpen: true,
            };
          }
          return {
            items: [...state.items, { ...product, quantity: 1 }],
            isOpen: true,
          };
        });
      },

      removeFromCart: (id: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeFromCart(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      // Note: These are computed in components, not as getters
      // The getters syntax doesn't work properly with zustand persist
      total: 0,
      itemCount: 0,
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
