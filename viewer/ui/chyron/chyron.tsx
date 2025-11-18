import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useContentStore } from '../../core/store/contentStore';
import useChyronStore from './store';
import './styles.css';

export const Chyron = () => {
  const isVisible = useChyronStore(state => state.isVisible);
  const currentCategory = useChyronStore(state => state.currentCategory);
  const showChyron = useChyronStore(state => state.showChyron);

  const activeCategoryIndex = useContentStore(state => state.activeCategoryIndex);
  const categoryTitles = useContentStore(state => state.categoryTitles);

  // Track previous category index to detect actual changes
  const prevCategoryIndexRef = useRef<number | null>(null);

  // Simple rule: category changed? Show the chyron. Period.
  useEffect(() => {
    // Early return if data not loaded yet
    if (categoryTitles.length === 0) return;

    const categoryName = categoryTitles[activeCategoryIndex];

    // Safety check: ensure categoryName exists
    if (!categoryName) {
      console.warn('[Chyron] categoryName undefined:', { activeCategoryIndex, categoryTitles });
      return;
    }

    const prevIndex = prevCategoryIndexRef.current;

    // Category changed (or first load)? Show the chyron.
    if (prevIndex !== activeCategoryIndex) {
      console.log('[Chyron] Category changed - showing chyron:', categoryName);
      showChyron(categoryName);
      prevCategoryIndexRef.current = activeCategoryIndex;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryIndex]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={currentCategory}
          className="chyron"
          initial={{ x: 300, opacity: 0 }}
          animate={{
            x: 0,
            opacity: 1,
            transition: {
              type: 'spring',
              stiffness: 200,
              damping: 25
            }
          }}
          exit={{
            x: 300,
            opacity: 0,
            transition: { duration: 0.3 }
          }}
        >
          <div className="chyron-content">
            <div className="chyron-label">NOW VIEWING</div>
            <div className="chyron-title">{currentCategory}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Chyron;
