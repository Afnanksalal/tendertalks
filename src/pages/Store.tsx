import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Check, Loader2 } from 'lucide-react';
import { useMerchStore } from '../stores/merchStore';
import { useCartStore } from '../stores/cartStore';
import type { MerchItem } from '../db/schema';

export const StorePage: React.FC = () => {
  const { items: merch, fetchMerch, isLoading, error } = useMerchStore();
  const { addToCart } = useCartStore();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchMerch();
  }, [fetchMerch]);

  const handleAddToCart = (item: MerchItem) => {
    addToCart(item);
    setAddedItems((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 1500);
  };

  const categories = ['all', 'clothing', 'accessories', 'digital'];
  const filteredMerch = selectedCategory && selectedCategory !== 'all'
    ? merch.filter((item) => item.category === selectedCategory)
    : merch;

  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-neon-purple/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-3 md:mb-4"
          >
            Official{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple">
              Merch
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-base md:text-lg"
          >
            Limited edition gear for our community
          </motion.p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === 'all' ? null : cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition-all touch-feedback ${
                (cat === 'all' && !selectedCategory) || selectedCategory === cat
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 text-lg mb-2">Failed to load products</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button 
              onClick={() => fetchMerch()}
              className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredMerch.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {filteredMerch.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl overflow-hidden hover:border-neon-cyan/50 transition-all duration-500"
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-slate-800/50 p-4 md:p-6">
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]" />

                  {item.imageUrl ? (
                    <motion.img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-10 relative"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-16 h-16 text-slate-600" />
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-3 md:top-4 left-3 md:left-4 z-20">
                    <span className="px-2 py-1 bg-black/50 border border-white/10 rounded text-[10px] text-slate-300 uppercase tracking-widest backdrop-blur-sm">
                      {item.category}
                    </span>
                  </div>

                  {/* Out of Stock Badge */}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                      <span className="px-4 py-2 bg-red-500/80 text-white text-sm font-bold rounded-lg">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 md:p-6 relative">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="text-base md:text-lg font-bold text-white leading-tight mb-1 group-hover:text-neon-cyan transition-colors truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {item.inStock ? 'In Stock' : 'Out of Stock'}
                      </p>
                    </div>
                    <span className="text-lg md:text-xl font-display text-white font-bold flex-shrink-0">
                      ₹{parseFloat(item.price).toFixed(0)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                  )}

                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={addedItems.has(item.id) || !item.inStock}
                    className={`w-full relative overflow-hidden py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all touch-feedback disabled:opacity-50 ${
                      addedItems.has(item.id)
                        ? 'bg-neon-green text-black'
                        : 'bg-white text-black hover:bg-neon-cyan'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {addedItems.has(item.id) ? (
                        <>
                          Added <Check size={18} />
                        </>
                      ) : (
                        <>
                          Add to Cart <Plus size={18} />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
