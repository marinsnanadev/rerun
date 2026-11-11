interface LoopMarkProps {
  size?: number;
}

/** The Rerun mark: an arrow that loops back on itself. */
export function LoopMark({ size = 24 }: LoopMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.7" />
      <path d="M20 3.5v5.2h-5.2" />
    </svg>
  );
}
