import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Check, Loader2, Share2 } from 'lucide-react';
import { useMerchStore } from '../stores/merchStore';
import { useCartStore } from '../stores/cartStore';
import type { MerchItem } from '../db/schema';
import toast from 'react-hot-toast';
import { SEO } from '../components/SEO';

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

  const handleShareProduct = async (item: MerchItem) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/store?product=${item.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.name} | TenderTalks Store`,
          text: item.description || 'Check out this merch from TenderTalks!',
          url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied!');
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const categories = ['all', 'clothing', 'accessories', 'digital'];
  const filteredMerch = selectedCategory && selectedCategory !== 'all'
    ? merch.filter((item) => item.category === selectedCategory)
    : merch;

  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4 relative overflow-x-hidden">
      <SEO 
        title="Store"
        description="Shop official TenderTalks merchandise. Limited edition gear for our community."
        url="/store"
        keywords="merch, merchandise, TenderTalks store, podcast merch"
      />
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-neon-purple/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 w-full">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredMerch.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                className="group relative bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:border-neon-cyan/50 transition-all duration-300"
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-slate-800/50 p-4">

                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-slate-600" />
                    </div>
                  )}

                  {/* Category Badge */}
                  <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-[10px] text-slate-300 uppercase tracking-wider">
                    {item.category}
                  </span>

                  {/* Out of Stock */}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="px-3 py-1.5 bg-red-500/80 text-white text-sm font-bold rounded">Out of Stock</span>
                    </div>
                  )}

                  {/* Share */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShareProduct(item); }}
                    className="absolute top-3 right-3 p-2 bg-black/60 rounded-lg text-slate-300 hover:text-white transition-colors"
                  >
                    <Share2 size={14} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-base font-bold text-white truncate group-hover:text-neon-cyan transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500">{item.inStock ? 'In Stock' : 'Out of Stock'}</p>
                    </div>
                    <span className="text-lg font-bold text-white flex-shrink-0">₹{parseFloat(item.price).toFixed(0)}</span>
                  </div>

                  {item.description && (
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{item.description}</p>
                  )}

                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={addedItems.has(item.id) || !item.inStock}
                    className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                      addedItems.has(item.id) ? 'bg-neon-green text-black' : 'bg-white text-black hover:bg-neon-cyan'
                    }`}
                  >
                    {addedItems.has(item.id) ? <><Check size={16} /> Added</> : <><Plus size={16} /> Add to Cart</>}
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
