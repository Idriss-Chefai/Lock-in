export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path
        d="M10 22V10.5C10 10.2239 10.2239 10 10.5 10H12.5C12.7761 10 13 10.2239 13 10.5V19H19.5C19.7761 19 20 19.2239 20 19.5V21.5C20 21.7761 19.7761 22 19.5 22H10.5C10.2239 22 10 21.7761 10 22Z"
        fill="white"
      />
      <circle cx="21.5" cy="11" r="2" fill="white" fillOpacity="0.85" />
    </svg>
  );
}
