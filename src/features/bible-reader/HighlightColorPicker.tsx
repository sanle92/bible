import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_CONFIGS, type HighlightColor } from '@/utils/highlightColors';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { cn } from '@/utils/cn';

interface HighlightColorPickerProps {
  open: boolean;
  onClose: () => void;
  onColorSelect: (color: HighlightColor) => void;
  onColorPreview?: (color: HighlightColor) => void;
  currentColor?: HighlightColor;
  showRecent?: boolean;
}

export function HighlightColorPicker({ open, onClose, onColorSelect, onColorPreview, currentColor, showRecent = true }: HighlightColorPickerProps) {
  const { lastHighlightColor, recentHighlightColors, setLastHighlightColor, addRecentHighlightColor } = usePreferencesStore();
  const [selectedColor, setSelectedColor] = useState<HighlightColor>(currentColor || lastHighlightColor);
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  useEffect(() => {
    if (currentColor) {
      setSelectedColor(currentColor);
    }
  }, [currentColor]);

  const handleColorHover = (color: HighlightColor) => {
    if (onColorPreview) {
      onColorPreview(color);
    }
  };

  const handleColorSelect = (color: HighlightColor) => {
    setSelectedColor(color);
    setLastHighlightColor(color);
    addRecentHighlightColor(color);
    onColorSelect(color);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.2 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
        >
          <div
            className={cn(
              'rounded-2xl p-3 w-64',
              'bg-[var(--bg-elevated)]/95 backdrop-blur-xl',
              'border border-[var(--border-subtle)]',
              'shadow-2xl shadow-black/10'
            )}
          >
            {showRecent && recentHighlightColors.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2 px-1">Recent</p>
                <div className="flex flex-wrap gap-2">
                  {recentHighlightColors.map((color) => (
                    <ColorButton
                      key={color}
                      color={color}
                      selected={selectedColor === color}
                      isDarkMode={isDarkMode}
                      onClick={() => handleColorSelect(color)}
                      onHover={() => handleColorHover(color)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2 px-1">All Colors</p>
              <div className="grid grid-cols-4 gap-2">
                {HIGHLIGHT_COLORS.map((color) => (
                  <ColorButton
                    key={color}
                    color={color}
                    selected={selectedColor === color}
                    isDarkMode={isDarkMode}
                    onClick={() => handleColorSelect(color)}
                    onHover={() => handleColorHover(color)}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ColorButtonProps {
  color: HighlightColor;
  selected: boolean;
  isDarkMode: boolean;
  onClick: () => void;
  onHover?: () => void;
}

function ColorButton({ color, selected, isDarkMode, onClick, onHover }: ColorButtonProps) {
  const config = HIGHLIGHT_COLOR_CONFIGS[color];
  const backgroundColor = isDarkMode ? config.darkMode : config.lightMode;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        'relative w-12 h-12 rounded-xl transition-all',
        'border-2',
        selected ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--border-subtle)]'
      )}
      style={{ backgroundColor }}
      title={config.name}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-[var(--accent)] rounded-full p-1">
            <Check size={12} className="text-white" />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}
