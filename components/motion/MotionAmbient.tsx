"use client";

import styles from "./MotionAmbient.module.css";

export default function MotionAmbient() {
  return (
    <div className={styles.ambientCanvas} aria-hidden="true">
      <svg
        className={styles.ambientSvg}
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Track Curve Geometry */}
        <path
          d="M-100 200 C300 200 600 450 600 750 C600 1050 300 1300 -100 1300"
          stroke="#1A3663"
          strokeWidth="1.5"
          className={styles.trackPath}
        />
        <path
          d="M-60 220 C320 220 580 460 580 750 C580 1040 320 1280 -60 1280"
          stroke="#5B9BD5"
          strokeWidth="1"
          strokeDasharray="6 6"
          className={styles.trackPathDash}
        />

        {/* Stadium Pitch Geometry */}
        <circle cx="1200" cy="450" r="280" stroke="#1A3663" strokeWidth="1" />
        <line x1="1200" y1="150" x2="1200" y2="750" stroke="#1A3663" strokeWidth="1.5" />
        <circle cx="1200" cy="450" r="4" fill="#E53737" />

        {/* Start Line Angle Marks */}
        <line x1="200" y1="80" x2="260" y2="20" stroke="#5B9BD5" strokeWidth="1.5" />
        <line x1="220" y1="80" x2="280" y2="20" stroke="#5B9BD5" strokeWidth="1.5" />
        <line x1="240" y1="80" x2="300" y2="20" stroke="#5B9BD5" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
