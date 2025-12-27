# Hesham Amoudi - 3D Interactive CV

A stunning 3D interactive CV website built with React and Three.js, featuring scroll-based animations and immersive 3D experiences.

## 🚀 Features

- **3D Interactive Environment**: Built with Three.js and React Three Fiber
- **Scroll-Based Navigation**: Each scroll movement advances through CV sections
- **Responsive Design**: Optimized for desktop and mobile devices  
- **Smooth Animations**: Framer Motion powered transitions
- **Modern UI**: Clean, professional design with gold accent theme
- **Performance Optimized**: Lazy loading and efficient 3D rendering

## 🛠️ Tech Stack

- **Frontend**: React 18
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **Animations**: Framer Motion, React Spring
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Create React App

## 📁 Project Structure

```
src/
├── components/
│   ├── sections/
│   │   ├── HeroSection.js          # Profile and introduction
│   │   ├── ExperienceSection.js    # Professional experience
│   │   ├── ProjectsSection.js      # Featured projects
│   │   ├── SkillsSection.js        # Technical skills
│   │   └── ContactSection.js       # Contact form and info
│   ├── Scene3D.js                  # Main 3D scene component
│   ├── Navigation.js               # Navigation and progress
│   └── LoadingScreen.js             # 3D loading animation
├── data/
│   └── cvData.js                   # CV content data
└── App.js                          # Main application component
```

## 🎯 Sections

1. **Hero Section**: Personal introduction with animated profile
2. **Experience**: Professional journey and achievements
3. **Projects**: Featured work and technologies used
4. **Skills**: Technical expertise and certifications
5. **Contact**: Contact form and social links

## 🎨 3D Elements

- **Floating Geometries**: Interactive spheres, cubes, and torus shapes
- **Particle Systems**: Animated background particles
- **Dynamic Lighting**: Scene lighting that changes with sections
- **Camera Movements**: Smooth transitions between sections
- **Material Effects**: Metallic and distortion materials

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## 🎮 Navigation

- **Scroll**: Use mouse wheel to navigate between sections
- **Arrow Keys**: Up/Down arrows for section navigation  
- **Click Navigation**: Side navigation dots for direct access
- **Mobile**: Touch and swipe gestures supported

## 📱 Responsive Design

- Desktop: Full 3D experience with all animations
- Tablet: Optimized 3D performance with simplified effects
- Mobile: Touch-friendly interface with reduced particle count

## 🔧 Customization

### Adding New Sections
1. Create new section component in `components/sections/`
2. Add section data to `data/cvData.js`
3. Import and include in main App component
4. Add corresponding 3D elements in Scene3D component

### Modifying 3D Elements
- Edit `Scene3D.js` for geometry and lighting changes
- Adjust animations in individual section components
- Customize colors and materials through Three.js materials

## 📈 Performance Features

- **Lazy Loading**: Components load on demand
- **Optimized Rendering**: Efficient Three.js scene management
- **Progressive Enhancement**: Fallbacks for older browsers
- **Memory Management**: Proper cleanup of 3D resources

## 🌟 Contact Information

**Hesham Amoudi**  
Business Application Senior Specialist  
📧 heshamamoudi.it@gmail.com  
📱 +966597477814  
🔗 [LinkedIn](https://www.linkedin.com/in/heshamamoudi)  
👨‍💻 [GitHub](https://github.com/heshamamoudi)

## 📄 License

This project is open source and available under the MIT License.

---

*Crafted with passion for technology and innovation* ✨
