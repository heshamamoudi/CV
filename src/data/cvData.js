export const personalInfo = {
  name: "HESHAM AMOUDI",
  title: "Business Application Senior Specialist",
  nationality: "Saudi",
  image: "./assets/images/profile.jpeg",
  contact: {
    email: "heshamamoudi.it@gmail.com",
    phone: "+966597477814",
    github: "https://github.com/heshamamoudi",
    linkedin: "https://www.linkedin.com/in/heshamamoudi"
  }
};

export const experiences = [
  {
    id: 1,
    title: "Business Application Senior Specialist",
    company: "Jeddah Airports Company",
    period: "Dec 2023 - Present",
    description: "Bridging the gap between business needs and technology solutions with focus on strategic business alignment, project management, and process optimization.",
    responsibilities: [
      "Collaborate with business leaders to identify needs and align application solutions with objectives",
      "Lead enterprise-wide technology projects ensuring timely delivery and stakeholder satisfaction",
      "Analyze workflows and implement digital solutions to enhance operations",
      "Ensure compliance with industry standards and security policies"
    ]
  },
  {
    id: 2,
    title: "Senior Application Engineer",
    company: "Jeddah Airports Company",
    period: "Dec 2023 - July 2023",
    description: "Designed and optimized software solutions to enhance operational efficiency in Digital Transformation sector.",
    responsibilities: [
      "Managed strategic projects through effective resource allocation and risk assessment",
      "Utilized MS365 Power Apps to digitally transform and automate manual processes",
      "Performed in-depth analysis to gather and evaluate project requirements"
    ]
  }
];

export const sideExperiences = [
  {
    id: 3,
    title: "Software Development Department Manager",
    company: "Rakeen - Hajj Season 2024",
    period: "April 2024 - July 2024",
    description: "Managed development of critical modules for Hajj Season 1445 project.",
    modules: [
      "Workforce Module",
      "Live Feed Pilgrims Module",
      "Evaluation Module",
      "Violations Module"
    ]
  }
];

export const projects = [
  {
    id: 1,
    title: "Airport Management System",
    description: "Digital transformation solution for Jeddah Airports implementing automated processes and streamlined operations.",
    demoUrl: "#",
    githubUrl: "https://github.com/heshamamoudi/airport-system",
    technologies: [".NET MVC", "Web API", "Azure", "PostgreSQL"]
  },
  {
    id: 2,
    title: "Hajj Season Modules",
    description: "Performance tracking system for Hajj season with real-time monitoring and evaluation capabilities.",
    demoUrl: "#",
    githubUrl: "https://github.com/heshamamoudi/hajj-modules",
    technologies: ["React", "Node.js", "MongoDB", "WebSocket"]
  }
];

export const skills = {
  expertise: [
    "Digital Transformation",
    "Project Management",
    "ERP Development",
    "API Development & Integration",
    "Full Stack Web Development"
  ],
  software: [
    ".Net MVC & Web API",
    "Flutter",
    "Angular/React",
    "Node.js",
    "PostgreSQL",
    "DevOps (AWS, Azure)"
  ],
  languages: [
    "Native Arabic",
    "Professional English"
  ]
};

export const navigation = [
  { id: "hero", label: "Home", icon: "home" },
  { id: "experience", label: "Experience", icon: "briefcase" },
  { id: "projects", label: "Projects", icon: "code" },
  { id: "skills", label: "Skills", icon: "settings" },
  { id: "contact", label: "Contact", icon: "mail" }
];
