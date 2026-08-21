'use client';

import React from 'react';

export function HealthGauge({
  score,
  grade,
}: {
  score: number;
  grade: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'CRITICAL';
}) {
  const clamped = Math.min(100, Math.max(0, score));
  
  // Circumference for r=40 is 2 * PI * 40 = 251.32
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  let strokeColor = '#16a34a'; // Green
  let badgeBg = 'bg-green-100 text-green-800 border-green-300';
  let label = 'Excellent Health';

  if (clamped < 50) {
    strokeColor = '#dc2626'; // Red
    badgeBg = 'bg-red-100 text-red-800 border-red-300';
    label = 'Critical Risk';
  } else if (clamped < 70) {
    strokeColor = '#ea580c'; // Orange
    badgeBg = 'bg-orange-100 text-orange-800 border-orange-300';
    label = 'Needs Attention';
  } else if (clamped < 85) {
    strokeColor = '#2563eb'; // Blue
    badgeBg = 'bg-blue-100 text-blue-800 border-blue-300';
    label = 'Good Health';
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-gray-100"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Animated Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Score in Center */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {clamped}
          </span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-3">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeBg}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
