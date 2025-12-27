import React, { useEffect, useState } from 'react';
import { Code, Globe, Brain, Award, Rocket, Zap } from 'lucide-react';
import { skills } from '../../data/cvData';

const categoryIcons = {
  expertise: Brain,
  software: Code,
  languages: Globe
};

function SkillsSection({ isActive, onNext, onPrev }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [isActive]);

  return (
    <section className={`fixed inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${
      isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
        <div className="bg-black/20 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-white/10">
        
        {/* Header */}
        <div className={`text-center mb-6 md:mb-8 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
        }`}>
          <h2 className="text-2xl md:text-4xl font-bold mb-2">
            <span className="text-space-primary">Technical</span>{' '}
            <span className="text-space-accent">Skills</span>
          </h2>
          <p className="text-space-secondary text-xs md:text-sm">
            Expertise across modern technologies
          </p>
        </div>

        {/* Main Content - 2 Row Layout */}
        <div className="space-y-4 md:space-y-6">
          
          {/* Row 1: Skill Categories */}
          <div className={`grid grid-cols-3 gap-2 md:gap-4 transition-all duration-700 delay-100 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}>
            {Object.entries(skills).map(([category, skillsList], index) => {
              const Icon = categoryIcons[category] || Code;
              return (
                <div key={category} className="bg-space-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-2 md:p-4">
                  <div className="flex items-center gap-1 md:gap-2 mb-2">
                    <Icon size={14} className="text-space-accent hidden md:block" />
                    <h3 className="text-xs md:text-sm font-bold text-space-primary capitalize truncate">{category}</h3>
                  </div>
                  <div className="space-y-1">
                    {skillsList.slice(0, 4).map((skill, idx) => (
                      <div key={idx} className="text-xs text-space-secondary truncate">
                        • {skill}
                      </div>
                    ))}
                    {skillsList.length > 4 && (
                      <div className="text-xs text-space-accent">+{skillsList.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 2: Certifications & Experience */}
          <div className={`grid grid-cols-2 gap-2 md:gap-4 transition-all duration-700 delay-200 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}>
            {/* Certifications */}
            <div className="bg-space-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-1 md:gap-2 mb-2">
                <Award size={14} className="text-space-accent" />
                <h3 className="text-xs md:text-sm font-bold text-space-primary">Certifications</h3>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-space-secondary truncate">Azure Fundamentals</span>
                  <span className="text-space-accent">Active</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-space-secondary truncate">PMP</span>
                  <span className="text-space-highlight">In Progress</span>
                </div>
              </div>
            </div>

            {/* Experience Level */}
            <div className="bg-space-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-2 md:p-4">
              <div className="flex items-center gap-1 md:gap-2 mb-2">
                <Rocket size={14} className="text-space-accent" />
                <h3 className="text-xs md:text-sm font-bold text-space-primary">Experience</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-space-secondary">Senior Level</span>
                    <span className="text-space-accent">5+ Yrs</span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-1.5">
                    <div className="bg-space-accent h-1.5 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-space-secondary">Leadership</span>
                    <span className="text-space-accent">3+ Yrs</span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-1.5">
                    <div className="bg-space-highlight h-1.5 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Highlights */}
          <div className={`flex flex-wrap justify-center gap-2 md:gap-3 transition-all duration-700 delay-300 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}>
            <div className="flex items-center gap-1 bg-space-accent/20 text-space-accent px-2 md:px-4 py-1 md:py-2 rounded-full text-xs">
              <Zap size={12} />
              <span>Full Stack</span>
            </div>
            <div className="flex items-center gap-1 bg-space-highlight/20 text-space-highlight px-2 md:px-4 py-1 md:py-2 rounded-full text-xs">
              <Code size={12} />
              <span>Digital Transformation</span>
            </div>
            <div className="flex items-center gap-1 bg-space-secondary/20 text-space-secondary px-2 md:px-4 py-1 md:py-2 rounded-full text-xs">
              <Brain size={12} />
              <span>Strategic Planning</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

export default SkillsSection;
