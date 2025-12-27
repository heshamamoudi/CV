import React, { useState, useEffect, useCallback } from 'react';
import { Home, Briefcase, Code, Settings, Mail, ChevronUp, ChevronDown } from 'lucide-react';
import { navigation } from '../data/cvData';

const iconMap = {
  home: Home,
  briefcase: Briefcase,
  code: Code,
  settings: Settings,
  mail: Mail
};

function Navigation({ currentSection, onSectionChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNavigation = useCallback((direction) => {
    if (direction === 'up' && currentSection > 0) {
      onSectionChange(currentSection - 1);
    } else if (direction === 'down' && currentSection < navigation.length - 1) {
      onSectionChange(currentSection + 1);
    }
  }, [currentSection, onSectionChange]);

  const handleSectionClick = (index) => {
    onSectionChange(index);
    setIsExpanded(false);
  };

  useEffect(() => {
    let isScrolling = false;
    let scrollTimeout;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigation('up');
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigation('down');
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      
      // Prevent rapid firing of scroll events
      if (isScrolling) return;
      
      isScrolling = true;
      
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Determine scroll direction with better sensitivity
      const delta = e.deltaY || e.detail || e.wheelDelta;
      const normalizedDelta = Math.sign(delta);
      
      if (normalizedDelta > 0) {
        handleNavigation('down');
      } else if (normalizedDelta < 0) {
        handleNavigation('up');
      }
      
      // Reset scroll lock after delay
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 800); // Increased delay for smoother navigation
    };

    // Handle touch events for mobile/trackpad
    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      touchEndY = e.changedTouches[0].screenY;
      
      // Minimum swipe distance
      const minSwipeDistance = 50;
      const swipeDistance = touchStartY - touchEndY;
      
      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0) {
          handleNavigation('down');
        } else {
          handleNavigation('up');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [currentSection, handleNavigation]);

  return (
    <>
      {/* Side Navigation - Hidden on mobile, shown on desktop */}
      <nav className="fixed right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-50 hidden md:flex">
        <div className="flex flex-col items-center space-y-4">
          {/* Navigation Dots */}
          <div className="flex flex-col space-y-3">
            {navigation.map((item, index) => {
              const Icon = iconMap[item.icon];
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionClick(index)}
                  className={`group relative p-4 rounded-full transition-all duration-300 border-2 ${
                    currentSection === index
                      ? 'bg-gold text-black scale-110 border-gold shadow-lg shadow-gold/50'
                      : 'bg-dark-enhanced text-high-contrast hover:bg-gold/20 border-white/30 hover:border-gold'
                  }`}
                  title={item.label}
                >
                  <Icon size={20} />
                  
                  {/* Tooltip */}
                  <div className={`absolute right-full mr-4 px-3 py-2 bg-black/80 text-white text-sm rounded-lg whitespace-nowrap transition-all duration-300 ${
                    currentSection === index || isExpanded
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-2 pointer-events-none'
                  }`}>
                    {item.label}
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-black/80"></div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Scroll Arrows */}
          <div className="flex flex-col space-y-2 mt-8">
            <button
              onClick={() => handleNavigation('up')}
              disabled={currentSection === 0}
              className={`p-2 rounded-full transition-all duration-300 ${
                currentSection === 0
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 text-white hover:bg-gold hover:text-black'
              }`}
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => handleNavigation('down')}
              disabled={currentSection === navigation.length - 1}
              className={`p-2 rounded-full transition-all duration-300 ${
                currentSection === navigation.length - 1
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 text-white hover:bg-gold hover:text-black'
              }`}
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Horizontal at top */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 md:hidden">
        <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-full border border-gold/30">
          {navigation.map((item, index) => {
            const Icon = iconMap[item.icon];
            return (
              <button
                key={item.id}
                onClick={() => handleSectionClick(index)}
                className={`p-2 rounded-full transition-all duration-300 ${
                  currentSection === index
                    ? 'bg-gold text-black shadow-lg'
                    : 'text-white/70'
                }`}
                title={item.label}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Progress Bar - Compact on mobile */}
      <div className="fixed bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center space-x-2 md:space-x-4 bg-black/60 backdrop-blur-md px-3 md:px-6 py-2 md:py-4 rounded-full md:rounded-2xl border border-gold/30 shadow-xl">
          <span className="text-gold-bright text-sm md:text-lg font-bold">
            {currentSection + 1}/{navigation.length}
          </span>
          <div className="w-20 md:w-40 h-1.5 md:h-2 bg-white/20 rounded-full overflow-hidden border border-white/30">
            <div
              className="h-full bg-gradient-to-r from-gold to-yellow-400 transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${((currentSection + 1) / navigation.length) * 100}%` }}
            />
          </div>
          <span className="hidden md:inline text-high-contrast font-semibold">
            {navigation[currentSection]?.label}
          </span>
        </div>
      </div>

      {/* Instructions - Hidden on mobile */}
      <div className="fixed bottom-8 right-8 z-50 hidden md:block">
        <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-gold/20 shadow-lg">
          <p className="text-high-contrast font-medium text-sm">
            ↑↓ Keys or scroll to navigate
          </p>
        </div>
      </div>
    </>
  );
}

export default Navigation;
