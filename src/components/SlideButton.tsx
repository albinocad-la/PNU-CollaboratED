import React, { useState } from 'react';
import { motion } from 'motion/react';

interface SlideButtonProps {
  onToggle?: (active: boolean) => void;
  label?: string;
  activeColor?: string;
  inactiveColor?: string;
  isActive?: boolean;
}

const SlideButton: React.FC<SlideButtonProps> = ({ 
  onToggle, 
  label = "Study Mode",
  activeColor = "bg-indigo-600",
  inactiveColor = "bg-slate-300 dark:bg-slate-700",
  isActive: controlledActive
}) => {
  const [internalActive, setInternalActive] = useState(false);
  const isActive = controlledActive !== undefined ? controlledActive : internalActive;

  const handleToggle = () => {
    const newState = !isActive;
    if (controlledActive === undefined) {
      setInternalActive(newState);
    }
    if (onToggle) onToggle(newState);
  };

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>}
      <button
        onClick={handleToggle}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          isActive ? activeColor : inactiveColor
        }`}
      >
        <motion.div
          animate={{ x: isActive ? 26 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
};

export default SlideButton;
