import React, { useEffect, useState } from 'react';
import { Github, Linkedin, Mail, Phone, ArrowDown } from 'lucide-react';
import { personalInfo } from '../../data/cvData';

function HeroSection({ isActive, onNext }) {
  const [isVisible, setIsVisible] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  
  const animatedTexts = [
    'Business Application Senior Specialist',
    'Digital Transformation Expert',
    'Full Stack Developer'
  ];

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      const textInterval = setInterval(() => {
        setTextIndex(prev => (prev + 1) % animatedTexts.length);
      }, 3000);
      return () => clearInterval(textInterval);
    } else {
      setIsVisible(false);
    }
  }, [isActive, animatedTexts.length]);

  return (
    <section className={`fixed inset-0 flex items-center justify-center transition-all duration-700 ${
      isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8">
        
        {/* Main Content - Centered with transparent background */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 bg-black/30 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-white/10">
          
          {/* Profile Image - Left on Desktop, Top on Mobile */}
          <div className={`flex-shrink-0 transition-all duration-700 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}>
            <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-3 md:border-4 border-space-accent shadow-xl">
              <div className="w-full h-full bg-gradient-to-br from-space-accent via-space-highlight to-space-secondary">
                <img 
                  src={personalInfo.image} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  style={{ filter: 'contrast(1.1) brightness(1.05)', mixBlendMode: 'screen' }}
                />
              </div>
            </div>
          </div>
          
          {/* Content - Right on Desktop, Below on Mobile */}
          <div className="flex-1 text-center md:text-left">
            
            {/* Name */}
            <div className={`transition-all duration-700 delay-100 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
            }`}>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2">
                <span className="text-space-accent">{personalInfo.name.split(' ')[0]}</span>
                <span className="text-space-primary"> {personalInfo.name.split(' ')[1]}</span>
              </h1>
              
              {/* Animated Role */}
              <p className="text-sm md:text-lg text-space-accent mb-3 h-6 md:h-8">
                {animatedTexts[textIndex]}
              </p>
              
              {/* Tags */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                <span className="bg-space-card/50 text-space-secondary text-xs px-3 py-1 rounded-full border border-white/10">
                  {personalInfo.nationality}
                </span>
                <span className="bg-space-accent/20 text-space-accent text-xs px-3 py-1 rounded-full">
                  Available for Hire
                </span>
              </div>
            </div>
            
            {/* Stats */}
            <div className={`flex justify-center md:justify-start gap-4 mb-4 transition-all duration-700 delay-200 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
            }`}>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-space-accent">3+</div>
                <div className="text-xs text-space-secondary">Years Exp</div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-space-accent">10+</div>
                <div className="text-xs text-space-secondary">Projects</div>
              </div>
            </div>
            
            {/* Contact Links */}
            <div className={`flex flex-wrap justify-center md:justify-start gap-2 transition-all duration-700 delay-300 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
            }`}>
              <a href={personalInfo.contact.github} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 bg-space-card/50 hover:bg-space-accent hover:text-black px-3 py-1.5 rounded-full text-xs text-space-secondary transition-all border border-white/10">
                <Github size={14} />
                <span className="hidden md:inline">GitHub</span>
              </a>
              <a href={personalInfo.contact.linkedin} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 bg-space-card/50 hover:bg-space-accent hover:text-black px-3 py-1.5 rounded-full text-xs text-space-secondary transition-all border border-white/10">
                <Linkedin size={14} />
                <span className="hidden md:inline">LinkedIn</span>
              </a>
              <a href={`mailto:${personalInfo.contact.email}`}
                className="flex items-center gap-1 bg-space-card/50 hover:bg-space-accent hover:text-black px-3 py-1.5 rounded-full text-xs text-space-secondary transition-all border border-white/10">
                <Mail size={14} />
                <span className="hidden md:inline">Email</span>
              </a>
              <a href={`tel:${personalInfo.contact.phone}`}
                className="flex items-center gap-1 bg-space-card/50 hover:bg-space-accent hover:text-black px-3 py-1.5 rounded-full text-xs text-space-secondary transition-all border border-white/10">
                <Phone size={14} />
                <span className="hidden md:inline">Call</span>
              </a>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className={`text-center mt-8 md:mt-12 transition-all duration-700 delay-400 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
        }`}>
          <button
            onClick={onNext}
            className="group flex flex-col items-center gap-1 text-space-muted hover:text-space-accent transition-colors"
          >
            <span className="text-xs">Explore</span>
            <ArrowDown size={20} className="animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
