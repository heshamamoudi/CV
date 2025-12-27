import React, { useEffect, useState } from 'react';
import { Building, Calendar } from 'lucide-react';
import { experiences, sideExperiences } from '../../data/cvData';
import PageIndicator from '../PageIndicator';

function ExperienceSection({ isActive, onNext, onPrev }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Combine all experiences for pagination
  const allExperiences = [...experiences, ...sideExperiences];
  const ITEMS_PER_PAGE = 2;
  const totalPages = Math.ceil(allExperiences.length / ITEMS_PER_PAGE);
  
  const currentExperiences = allExperiences.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (isActive) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
      setCurrentPage(0); // Reset page when leaving section
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
            <span className="text-space-primary">Professional</span>{' '}
            <span className="text-space-accent">Journey</span>
          </h2>
          <p className="text-space-secondary text-xs md:text-sm">
            Strategic solutions bridging technology and business
          </p>
        </div>

        {/* Experience Cards - Paginated */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {currentExperiences.map((experience, index) => (
            <div key={experience.id} className={`transition-all duration-500 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
            }`} style={{ transitionDelay: `${index * 100}ms` }}>
              <div className="bg-space-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 md:p-5 h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    index === 0 && currentPage === 0 ? 'bg-space-accent' : 'bg-space-highlight/20'
                  }`}>
                    <Building size={16} className={index === 0 && currentPage === 0 ? 'text-black' : 'text-space-highlight'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm md:text-base font-bold text-space-primary">{experience.title}</h3>
                        <p className="text-space-accent text-xs">{experience.company}</p>
                      </div>
                      {index === 0 && currentPage === 0 && (
                        <span className="text-xs bg-space-accent text-black px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-space-muted text-xs">
                      <Calendar size={10} />
                      <span>{experience.period}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-space-secondary text-xs leading-relaxed mb-3">{experience.description}</p>
                
                {/* Tech Stack */}
                <div className="flex flex-wrap gap-1">
                  {(experience.technologies || ['Development', 'Design']).slice(0, 4).map((tech, idx) => (
                    <span key={idx} className="bg-space-accent/20 text-space-accent px-2 py-0.5 rounded text-xs">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Page Indicator */}
        {totalPages > 1 && (
          <PageIndicator
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        )}
        </div>
      </div>
    </section>
  );
}

export default ExperienceSection;
