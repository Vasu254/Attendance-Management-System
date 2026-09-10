/**
 * Fullstack Experts Academy logo – uses the actual brand image.
 */
export default function InnoLogo({ size = 40, className = "" }) {
  return (
    <img
      src="/logo.png"
      alt="Fullstack Experts Academy"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
