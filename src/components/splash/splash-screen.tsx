"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Phase 1: Logo küçükten büyümeye başlar (başlangıçta)
    const phase1 = setTimeout(() => setAnimationPhase(1), 100);

    // Phase 2: Yazı fade in (logo büyüdükten sonra)
    const phase2 = setTimeout(() => setAnimationPhase(2), 800);

    // Phase 3: Fade out başlar
    const phase3 = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 600);
    }, minDuration);

    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(phase3);
    };
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-600 ${
        isAnimating ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Glow Effect */}
      <div
        className={`absolute rounded-full bg-[#f5a623]/10 blur-3xl transition-all duration-1000 ease-out ${
          animationPhase >= 1 ? "w-96 h-96 opacity-100" : "w-0 h-0 opacity-0"
        }`}
      />

      {/* Logo Container - Scale Animation */}
      <div
        className={`relative mb-4 transition-all duration-700 ease-out ${
          animationPhase >= 1
            ? "scale-100 opacity-100"
            : "scale-0 opacity-0"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bounce effect
        }}
      >
        {/* Orijinal Logo */}
        <div className="relative w-48 h-48 md:w-64 md:h-64">
          <Image
            src="/logo.png"
            alt="Atlas Group Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Text - Fade in after logo */}
      <div
        className={`text-center transition-all duration-500 ease-out ${
          animationPhase >= 2
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }`}
      >
        <p className="text-[#f5a623] text-sm md:text-base italic">
          Best food, best prices
        </p>
      </div>

      {/* Loading Indicator - Fade in with text */}
      <div
        className={`mt-10 transition-all duration-500 delay-200 ${
          animationPhase >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex space-x-2">
          <div className="w-2.5 h-2.5 bg-[#f5a623] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2.5 h-2.5 bg-[#f5a623] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2.5 h-2.5 bg-[#f5a623] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>

      {/* Version */}
      <div
        className={`absolute bottom-8 text-[#4a4543]/40 text-xs transition-opacity duration-500 ${
          animationPhase >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        v1.0.0
      </div>
    </div>
  );
}
