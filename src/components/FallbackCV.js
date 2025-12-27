import React, { useState } from 'react';
import { Github, Linkedin, Mail, Phone, Download, ChevronDown, Building, Calendar, Code, ExternalLink, Globe, Brain, MapPin, Send } from 'lucide-react';
import { personalInfo, experiences, sideExperiences, projects, skills } from '../data/cvData';

function FallbackCV() {
  const [activeSection, setActiveSection] = useState('hero');

  const sections = [
    { id: 'hero', label: 'Profile', icon: 'user' },
    { id: 'experience', label: 'Experience', icon: 'briefcase' },
    { id: 'projects', label: 'Projects', icon: 'code' },
    { id: 'skills', label: 'Skills', icon: 'settings' },
    { id: 'contact', label: 'Contact', icon: 'mail' }
  ];

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* WebGL Fallback Notice */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-b border-yellow-500/30 p-4">
        <div className="container mx-auto text-center">
          <p className="text-yellow-200 text-sm">
            ⚠️ 3D features unavailable. Showing standard CV format. 
            <span className="ml-2 text-yellow-100">Enable WebGL in your browser for the full 3D experience.</span>
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-16 right-8 z-50 bg-black/50 backdrop-blur-sm rounded-2xl p-4">
        <div className="flex flex-col space-y-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`p-3 rounded-xl transition-all duration-300 text-sm font-medium ${
                activeSection === section.id
                  ? 'bg-gold text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={section.label}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-4xl">
          {/* Profile Image */}
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-gold to-yellow-500 p-1">
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-4xl font-bold">
                {personalInfo.name.charAt(0)}
              </div>
            </div>
          </div>

          {/* Name and Title */}
          <h1 className="text-6xl font-bold mb-4">
            <span className="text-gold">{personalInfo.name.split(' ')[0]}</span>
            <br />
            <span className="text-white">{personalInfo.name.split(' ')[1]}</span>
          </h1>
          
          <p className="text-2xl text-gold mb-2">{personalInfo.nationality}</p>
          <p className="text-xl text-gray-300 mb-8">{personalInfo.title}</p>

          {/* Contact Links */}
          <div className="flex justify-center space-x-4 mb-8">
            <a href={personalInfo.contact.github} target="_blank" rel="noopener noreferrer" 
               className="bg-white/10 hover:bg-gold hover:text-black p-3 rounded-full transition-all duration-300">
              <Github size={20} />
            </a>
            <a href={personalInfo.contact.linkedin} target="_blank" rel="noopener noreferrer"
               className="bg-white/10 hover:bg-gold hover:text-black p-3 rounded-full transition-all duration-300">
              <Linkedin size={20} />
            </a>
            <a href={`mailto:${personalInfo.contact.email}`}
               className="bg-white/10 hover:bg-gold hover:text-black p-3 rounded-full transition-all duration-300">
              <Mail size={20} />
            </a>
            <a href={`tel:${personalInfo.contact.phone}`}
               className="bg-white/10 hover:bg-gold hover:text-black p-3 rounded-full transition-all duration-300">
              <Phone size={20} />
            </a>
          </div>

          <button className="bg-gold text-black hover:bg-yellow-400 px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
            <Download className="inline mr-2" size={18} />
            Download CV
          </button>

          <div className="mt-12">
            <ChevronDown 
              className="mx-auto animate-bounce cursor-pointer" 
              size={32}
              onClick={() => scrollToSection('experience')}
            />
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">
            Professional <span className="text-gold">Experience</span>
          </h2>

          <div className="space-y-8">
            {experiences.map((exp) => (
              <div key={exp.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{exp.title}</h3>
                    <div className="flex items-center text-gold mb-2">
                      <Building size={16} className="mr-2" />
                      <span>{exp.company}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Calendar size={16} className="mr-2" />
                      <span>{exp.period}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-6">{exp.description}</p>
                
                <ul className="space-y-3">
                  {exp.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="w-2 h-2 bg-gold rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-300">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Side Experience */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold mb-8">Side Experience</h3>
            {sideExperiences.map((exp) => (
              <div key={exp.id} className="bg-gradient-to-r from-gold/10 to-yellow-400/10 border border-gold/20 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{exp.title}</h4>
                    <div className="flex items-center text-gold mb-2">
                      <Building size={16} className="mr-2" />
                      <span>{exp.company}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Calendar size={16} className="mr-2" />
                      <span>{exp.period}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-4">{exp.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {exp.modules.map((module, idx) => (
                    <div key={idx} className="bg-white/10 px-3 py-2 rounded-lg text-sm text-center">
                      {module}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 px-6 bg-black/20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">
            Featured <span className="text-gold">Projects</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {projects.map((project) => (
              <div key={project.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">{project.title}</h3>
                <p className="text-gray-300 mb-6">{project.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.technologies.map((tech, idx) => (
                    <span key={idx} className="bg-white/10 px-3 py-1 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
                
                <div className="flex space-x-4">
                  <a href={project.demoUrl} className="flex items-center bg-gold text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                    <ExternalLink size={16} className="mr-2" />
                    Live Demo
                  </a>
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors">
                    <Github size={16} className="mr-2" />
                    GitHub
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">
            Technical <span className="text-gold">Skills</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <Brain className="text-gold mr-3" size={24} />
                <h3 className="text-2xl font-bold">Expertise</h3>
              </div>
              <ul className="space-y-3">
                {skills.expertise.map((skill, idx) => (
                  <li key={idx} className="text-gray-300">{skill}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <Code className="text-gold mr-3" size={24} />
                <h3 className="text-2xl font-bold">Software</h3>
              </div>
              <ul className="space-y-3">
                {skills.software.map((skill, idx) => (
                  <li key={idx} className="text-gray-300">{skill}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <Globe className="text-gold mr-3" size={24} />
                <h3 className="text-2xl font-bold">Languages</h3>
              </div>
              <ul className="space-y-3">
                {skills.languages.map((skill, idx) => (
                  <li key={idx} className="text-gray-300">{skill}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-black/20">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-16">
            Get In <span className="text-gold">Touch</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="text-gold mr-4" size={20} />
                  <span>{personalInfo.contact.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="text-gold mr-4" size={20} />
                  <span>{personalInfo.contact.phone}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="text-gold mr-4" size={20} />
                  <span>Saudi Arabia, Jeddah</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Your Name" 
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-gold focus:outline-none"
                  />
                  <input 
                    type="email" 
                    placeholder="Your Email" 
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-gold focus:outline-none"
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Subject" 
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-gold focus:outline-none"
                />
                <textarea 
                  rows={5} 
                  placeholder="Your Message" 
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-gold focus:outline-none resize-none"
                />
                <button className="w-full bg-gold text-black font-bold py-4 rounded-lg hover:bg-yellow-400 transition-colors">
                  <Send className="inline mr-2" size={18} />
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-white/10">
        <p className="text-gray-400">
          © 2024 Hesham Amoudi. Crafted with passion for technology and innovation.
        </p>
      </footer>
    </div>
  );
}

export default FallbackCV;
