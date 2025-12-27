import React, { useEffect, useState } from 'react';
import { Mail, Phone, Github, Linkedin, MapPin, Send } from 'lucide-react';
import { personalInfo } from '../../data/cvData';

function ContactSection({ isActive, onPrev }) {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    if (isActive) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [isActive]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const mailtoLink = `mailto:${personalInfo.contact.email}?subject=Contact from ${formData.name}&body=${encodeURIComponent(formData.message + '\n\nFrom: ' + formData.email)}`;
    window.location.href = mailtoLink;
  };

  const contactLinks = [
    { icon: Mail, label: 'Email', value: personalInfo.contact.email, href: `mailto:${personalInfo.contact.email}` },
    { icon: Phone, label: 'Phone', value: personalInfo.contact.phone, href: `tel:${personalInfo.contact.phone}` },
    { icon: Linkedin, label: 'LinkedIn', value: 'Connect', href: personalInfo.contact.linkedin },
    { icon: Github, label: 'GitHub', value: 'Code', href: personalInfo.contact.github },
  ];

  return (
    <section className={`fixed inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${
      isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8">
        <div className="bg-black/20 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-white/10">
        
        {/* Header */}
        <div className={`text-center mb-6 md:mb-8 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
        }`}>
          <h2 className="text-2xl md:text-4xl font-bold mb-2">
            <span className="text-space-primary">Get In</span>{' '}
            <span className="text-space-accent">Touch</span>
          </h2>
          <p className="text-space-secondary text-xs md:text-sm">
            Ready to discuss your next project?
          </p>
        </div>

        {/* Main Content - 2 Column on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          
          {/* Contact Links */}
          <div className={`transition-all duration-700 delay-100 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
              {contactLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="bg-space-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-4 hover:border-space-accent/30 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <link.icon size={16} className="text-space-accent" />
                    <div>
                      <div className="text-xs font-medium text-space-primary">{link.label}</div>
                      <div className="text-xs text-space-secondary truncate">{link.value}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            
            {/* Location */}
            <div className="bg-space-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-space-accent" />
                <span className="text-xs font-medium text-space-primary">Location</span>
              </div>
              <p className="text-xs text-space-secondary">Saudi Arabia, Jeddah</p>
              <div className="flex items-center gap-1 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Available for projects</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className={`transition-all duration-700 delay-200 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
          }`}>
            <form onSubmit={handleSubmit} className="bg-space-card/50 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-space-primary placeholder-space-muted focus:border-space-accent focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-space-primary placeholder-space-muted focus:border-space-accent focus:outline-none"
                />
              </div>
              <textarea
                placeholder="Your message..."
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                required
                rows={3}
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-space-primary placeholder-space-muted focus:border-space-accent focus:outline-none resize-none"
              />
              <button
                type="submit"
                className="w-full bg-space-accent text-black font-medium py-2 rounded text-xs flex items-center justify-center gap-2 hover:bg-space-highlight transition-colors"
              >
                <Send size={12} />
                Send Message
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center mt-6 md:mt-8 transition-all duration-700 delay-300 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
        }`}>
          <p className="text-space-muted text-xs">
            © 2024 Hesham Amoudi
          </p>
        </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
