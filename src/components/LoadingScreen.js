import React, { useEffect, useState } from "react";

const loadingSteps = [
  "Systems ready...",
  "Engines ignited...",
  "Liftoff!",
  "Breaking atmosphere...",
  "Entering orbit...",
  "Welcome aboard!",
];

function LoadingScreen({ onLoadingComplete }) {
  const [phase, setPhase] = useState("countdown"); // countdown, launching, complete
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(
    "Preparing launch sequence..."
  );
  const [cameraShake, setCameraShake] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Phase 1: Countdown (3-2-1)
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          // Start launch phase after countdown
          setTimeout(() => {
            setPhase("launching");
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, []);

  useEffect(() => {
    // Phase 2: Launch progress (only after countdown)
    if (phase !== "launching") return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 0.3;

        // Update loading text based on progress
        const stepIndex = Math.floor((newProgress / 100) * loadingSteps.length);
        if (stepIndex < loadingSteps.length) {
          setLoadingText(loadingSteps[stepIndex]);
        }

        // Camera shake effect during launch
        if (newProgress < 80) {
          setCameraShake(Math.random() * 4 - 2);
        } else {
          setCameraShake(0);
        }
        if (newProgress >= 100) {
          clearInterval(timer);
          setPhase("complete");

          // Delay fade-out AFTER showing "Here where everything begins"
          setTimeout(() => {
            setFadeOut(true); // start fading out after 3 seconds
          }, 1500);

          // Optionally: call onLoadingComplete after fade finishes
          setTimeout(onLoadingComplete, 1800); // 3s wait + 1s fade
          return 100;
        }

        return newProgress;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [phase, onLoadingComplete]);

  // Calculate rocket position and scale based on progress
  const rocketBottom = phase === "launching" ? `${progress * 0.8}vh` : "10vh";
  const rocketScale = phase === "launching" ? 1 + (progress / 100) * 0.5 : 1;
  const screenY = phase === "launching" ? -progress * 2 : 0;

  // Fade out effect at the end
  const containerOpacity = fadeOut ? 0 : 1;
  const rocketOpacity = fadeOut ? 0 : 1;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black flex items-center justify-center z-50 overflow-hidden transition-opacity duration-1000"
      style={{ opacity: containerOpacity }}
    >
      {/* Stars background - moves with rocket */}
      <div
        className="absolute inset-0 transition-transform duration-300"
        style={{
          transform: `translateY(${screenY}px) translateX(${cameraShake}px)`,
        }}
      >
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 200 - 50}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.8 + 0.2,
              animation: "twinkle 2s ease-in-out infinite",
            }}
          />
        ))}
      </div>

      {/* Main content container - moves with camera */}
      <div
        className="text-center relative z-10 transition-all duration-300"
        style={{
          transform: `translateY(${screenY}px) translateX(${cameraShake}px)`,
          opacity: rocketOpacity,
        }}
      >
        {/* Countdown - BEFORE launch */}
        {phase === "countdown" && countdown > 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-9xl md:text-[12rem] font-bold text-gold drop-shadow-2xl animate-pulse">
              {countdown}
            </div>
            <p className="text-white text-xl md:text-2xl mt-8 animate-pulse">
              Preparing launch sequence...
            </p>
          </div>
        )}

        {/* Rocket - Only show during launching */}
        {(phase === "launching" || phase === "complete") && (
          <div
            className="relative w-40 h-40 md:w-48 md:h-48 mx-auto transition-all duration-500"
            style={{
              bottom: rocketBottom,
              transform: `scale(${rocketScale}) rotate(${
                cameraShake * 0.5
              }deg)`,
            }}
          >
            <div className="relative">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full drop-shadow-2xl"
              >
                {/* Intense Flames - grows with speed */}
                {phase === "launching" && (
                  <g>
                    <ellipse
                      cx="50"
                      cy="96"
                      rx={10 + progress * 0.1}
                      ry={15 + progress * 0.15}
                      fill="#FF4500"
                      opacity="0.9"
                      className="animate-pulse"
                    />
                    <ellipse
                      cx="50"
                      cy="93"
                      rx={8 + progress * 0.08}
                      ry={12 + progress * 0.12}
                      fill="#FF6B00"
                      opacity="0.85"
                      className="animate-pulse"
                    />
                    <ellipse
                      cx="50"
                      cy="91"
                      rx={6 + progress * 0.06}
                      ry={10 + progress * 0.1}
                      fill="#FFD700"
                      opacity="0.9"
                    />
                    <ellipse
                      cx="50"
                      cy="89"
                      rx={4 + progress * 0.04}
                      ry={8 + progress * 0.08}
                      fill="#FFFFFF"
                      className="animate-pulse"
                    />
                  </g>
                )}

                {/* Rocket body */}
                <rect
                  x="35"
                  y="40"
                  width="30"
                  height="45"
                  fill="#E8E8E8"
                  rx="3"
                />
                <polygon points="35,40 50,18 65,40" fill="#FFD700" />

                {/* Window with glow */}
                <circle cx="50" cy="50" r="10" fill="#4A90E2" opacity="0.8" />
                <circle
                  cx="50"
                  cy="50"
                  r="7"
                  fill="#87CEEB"
                  className="animate-pulse"
                />
                <circle cx="50" cy="50" r="4" fill="#E0F6FF" />

                {/* Fins */}
                <polygon points="35,70 23,88 35,88" fill="#FFD700" />
                <polygon points="65,70 77,88 65,88" fill="#FFD700" />

                {/* Details */}
                <rect
                  x="37"
                  y="58"
                  width="26"
                  height="3"
                  fill="#D4AF37"
                  opacity="0.7"
                />
                <rect
                  x="37"
                  y="66"
                  width="26"
                  height="3"
                  fill="#D4AF37"
                  opacity="0.7"
                />
                <rect
                  x="37"
                  y="74"
                  width="26"
                  height="3"
                  fill="#D4AF37"
                  opacity="0.7"
                />
              </svg>
            </div>

            {/* Heavy smoke trail */}
            {progress > 3 && (
              <div className="absolute left-1/2 top-full -translate-x-1/2">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute bg-gradient-to-b from-white/40 to-transparent rounded-full"
                    style={{
                      width: `${20 + i * 8}px`,
                      height: `${20 + i * 8}px`,
                      top: `${i * 15}px`,
                      left: "50%",
                      transform: "translateX(-50%)",
                      animation: `smokeFade ${1 + i * 0.2}s ease-out infinite`,
                      animationDelay: `${i * 0.1}s`,
                      opacity: 0.5 - i * 0.05,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Launch Info - Only during launch */}
        {phase === "launching" && (
          <>
            {/* Brand Name */}
            <div className="mb-6 animate-fadeIn">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                <span className="bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">
                  Hesham Amoudi
                </span>
              </h1>
              <p className="text-gray-300 text-sm md:text-base font-light">
                Digital Portfolio Experience
              </p>
            </div>

            {/* Loading Bar */}
            <div className="w-72 md:w-96 mx-auto mb-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
                <div
                  className="h-full bg-gradient-to-r from-gold via-yellow-400 to-gold transition-all duration-300 ease-out shadow-lg shadow-gold/50"
                  style={{
                    width: `${progress}%`,
                    boxShadow: `0 0 20px rgba(255, 215, 0, ${progress / 100})`,
                  }}
                />
              </div>
            </div>

            {/* Loading Text with Status */}
            <p className="text-gold text-base md:text-lg animate-pulse font-medium mb-2">
              {loadingText}
            </p>

            {/* Speed indicator */}
            <div className="flex items-center justify-center gap-4 text-sm text-white/60">
              <span className="font-mono">{Math.round(progress)}%</span>
              <span>•</span>
              <span>Speed: {Math.round(progress * 10)} km/s</span>
            </div>
          </>
        )}

        {/* Space reached message */}
        {phase === "complete" && (
          <div className="animate-fadeIn">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-gold via-white to-gold bg-clip-text text-transparent">
                Here where everything begins
              </span>
            </h2>
            <p className="text-gray-300 text-xl">Entering Experience...</p>
          </div>
        )}
      </div>

      {/* Ground/Platform - only visible at start */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent pointer-events-none transition-opacity duration-1000"
        style={{ opacity: progress < 30 ? 1 : 0 }}
      />

      {/* CSS Animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes smokeFade {
          0% {
            opacity: 0.5;
            transform: translateX(-50%) scale(0.5);
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) scale(1.5);
          }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `,
        }}
      />
    </div>
  );
}

export default LoadingScreen;
