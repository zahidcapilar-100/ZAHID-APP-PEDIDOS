import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StepWrapperProps {
  stepKey: string | number;
  direction: 'next' | 'back';
  children: React.ReactNode;
}

export const StepWrapper: React.FC<StepWrapperProps> = ({
  stepKey,
  direction,
  children,
}) => {
  // Slide right-to-left when advancing ('next'), left-to-right when going back ('back')
  const variants = {
    enter: (dir: 'next' | 'back') => ({
      x: dir === 'next' ? 60 : -60,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: 'next' | 'back') => ({
      x: dir === 'next' ? -60 : 60,
      opacity: 0,
      scale: 0.98,
    }),
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-2xl mx-auto min-h-[calc(100vh-120px)] mt-12">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 320, damping: 30 },
            opacity: { duration: 0.22 },
            scale: { duration: 0.22 },
          }}
          className="w-full flex flex-col justify-center my-auto"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
