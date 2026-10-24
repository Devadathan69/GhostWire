import { useId } from 'react';
export function RiftArtwork({
  theme = 'ember',
  className = '',
}: {
  theme?: string;
  className?: string;
}) {
  const uid = useId().replaceAll(':', '');
  const shadow = theme === 'shadow',
    storm = theme === 'storm';
  const color = shadow ? '#b69aff' : storm ? '#64d9ff' : '#c2f970';
  return (
    <svg className={className} viewBox="0 0 800 800" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}a`}>
          <stop stopColor={color} stopOpacity=".25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}b`}
          x1="300"
          y1="200"
          x2="500"
          y2="650"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#64766a" />
          <stop offset=".35" stopColor="#2d3937" />
          <stop offset="1" stopColor="#10191c" />
        </linearGradient>
        <linearGradient
          id={`${uid}c`}
          x1="250"
          y1="100"
          x2="600"
          y2="700"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a4bca5" />
          <stop offset=".25" stopColor="#526058" />
          <stop offset=".6" stopColor="#25332f" />
          <stop offset="1" stopColor="#111b20" />
        </linearGradient>
        <filter id={`${uid}g`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <circle cx="430" cy="390" r="370" fill={`url(#${uid}a)`} />
      <g opacity=".45" stroke={color}>
        <ellipse cx="430" cy="390" rx="226" ry="285" transform="rotate(24 430 390)" />
        <ellipse
          cx="430"
          cy="390"
          rx="250"
          ry="310"
          transform="rotate(24 430 390)"
          strokeDasharray="2 18"
        />
        <path d="M106 390h84m480 0h80M430 50v52m0 582v65" />
      </g>
      <g className="orbit-dust" fill={color}>
        {Array.from({ length: 30 }, (_, i) => (
          <circle
            key={i}
            cx={90 + ((i * 131) % 650)}
            cy={80 + ((i * 193) % 660)}
            r={i % 3 === 0 ? 2 : 1}
            opacity={0.15 + (i % 4) * 0.15}
          />
        ))}
      </g>
      <path d="m340 640-80 110h370l-95-116-86-30Z" fill="#0f1a1a" />
      <ellipse cx="435" cy="706" rx="220" ry="26" fill={color} opacity=".05" />
      <g className="titan-float">
        <path
          d="m363 232-61-72-28-100 90 80 31 57m105 30 67-79 18-94-85 86-32 60"
          fill={`url(#${uid}c)`}
          stroke="#819480"
          strokeWidth="1.5"
        />
        <path
          d="m341 225 71-50 80 10 50 62-37 102-68 31-70-47Z"
          fill={`url(#${uid}c)`}
          stroke="#5a7160"
          strokeWidth="2"
        />
        <path d="m341 225 87 25 113-3-43 26-27 65-37 24-54-41Z" fill="#172924" />
        <path d="m354 250 65 12-17 17-39-10m155-15-67 10 18 17 40-11" fill={color} />
        <path
          d="m354 250 65 12-17 17-39-10m155-15-67 10 18 17 40-11"
          fill={color}
          filter={`url(#${uid}g)`}
        />
        <path
          d="m429 267-10 45 26 21 18-24-16-44m-50 53 39 27 43-23"
          stroke="#728a70"
          strokeWidth="3"
        />
        <path
          d="m364 331-91 22-56 101 56 103 28-91 51-22m150-115 99 26 50 108-50 105-27-100-45-24"
          fill={`url(#${uid}b)`}
          stroke="#60745f"
          strokeWidth="2"
        />
        <path
          d="m273 353-55-23-55 63 13 70 68-36 47-49m310-23 54-24 55 65-13 72-70-41-44-51"
          fill={`url(#${uid}c)`}
          stroke="#75876e"
          strokeWidth="2"
        />
        <path
          d="m181 450-12 102 44 67 29-13-10-58 19-41m426-56 17 101-46 68-28-13 8-60-19-39"
          fill={`url(#${uid}c)`}
          stroke="#5a7160"
          strokeWidth="2"
        />
        <path
          d="m169 548-27 43 5 52 23-28 10-34m17 21 7 53 17-15 8-32m468-59 26 43-5 53-23-29-10-32m-17 19-8 55-18-15-7-33"
          fill="#3b4b40"
          stroke="#8ca37d"
        />
        <path
          d="m352 342 85 37 83-39 38 99-52 83-68 26-78-30-42-79Z"
          fill={`url(#${uid}c)`}
          stroke="#687e65"
          strokeWidth="2"
        />
        <path
          d="m345 367 84 28 6 60-69-27Zm178-1-73 28-3 61 63-28Z"
          fill="#22392c"
          stroke="#778c68"
        />
        <path d="m437 382-23 47 22 42 25-43Z" fill={color} />
        <path d="m437 382-23 47 22 42 25-43Z" fill={color} filter={`url(#${uid}g)`} />
        <path
          d="m370 455 65 25 64-24-11 35-52 21-55-22m4 27 49 15 49-15-19 37h-59Z"
          fill="#1a2e24"
          stroke="#7b926c"
        />
        <path
          d="m361 522-27 91 15 80 56 8 27-105-20-60m47 0-19 59 29 106 58-9 12-80-28-90"
          fill={`url(#${uid}b)`}
          stroke="#657c62"
          strokeWidth="2"
        />
        <path
          d="m334 610 58 10-6 30-41-12m138-18 55-11-10 28-38 13"
          stroke={color}
          strokeWidth="3"
        />
        <path d="m342 682-22 32 83 3 3-26m66 0-1 26 87-3-26-32" fill="#25362d" stroke="#81956f" />
        <g stroke={color} strokeWidth="2" opacity=".85">
          <path d="m280 369-30 27-36-1m383-26 31 26 35 1M367 201l26 30m103-34-24 31M373 566l-8 28m134-29 8 28" />
        </g>
      </g>
      <g fill="#1c2b24" stroke="#5f775b">
        <path d="m158 224 29-20 15 39-27 17Z" />
        <path d="m645 195 21 16-8 27-25-7Z" />
        <path d="m115 522 28 4 7 28-28 12Z" />
        <path d="m620 650 24-13 22 32-23 15Z" />
      </g>
      <path
        d="m98 717 15-53 9-4 17 18 5 45m-30-44-22 35m38-34 25 23"
        stroke="#d7fff1"
        strokeWidth="5"
      />
      <circle cx="118" cy="650" r="9" fill="#d7fff1" />
      <path d="m104 670-29 34 18 3 20-18" fill="#86d9c4" />
      <path d="m143 700 31-48" stroke={color} strokeWidth="4" />
      <g stroke={color} opacity=".45">
        <path d="m95 112 12 12-12 12-12-12Z" />
        <path d="m694 555 9 9-9 9-9-9Z" />
      </g>
    </svg>
  );
}
