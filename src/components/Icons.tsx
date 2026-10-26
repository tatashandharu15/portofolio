export function ArrowUpRight({ color = "currentColor" }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M 0 7.125 L 7.125 0" transform="translate(6 10.875)" />
      <path d="M 0 0 L 9.75 0 L 9.75 9.75 Z" transform="translate(8.25 6)" />
    </svg>
  );
}

export function ArrowElbowDownRight({ color = "currentColor" }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M 0 0 L 4.5 4.5 L 0 9 Z" transform="translate(15.75 12)" />
      <path d="M 0 0 L 0 13.5 L 9 13.5" transform="translate(6.75 3)" />
    </svg>
  );
}
