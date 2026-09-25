/**
 * Country flag as a small image. Emoji flags (🇺🇸) render as plain letters on Windows
 * ("usUSA"), so flags come from flagcdn.com (free) instead.
 */
export default function Flag({ code, className = '' }: { code: string; className?: string }) {
  const c = code.toLowerCase();
  if (!/^[a-z]{2}$/.test(c)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${c}.png`}
      alt=""
      aria-hidden
      loading="lazy"
      // inline size: card CSS stretches every poster <img> to 100% (.poster-container img)
      style={{ width: 20, height: 'auto', transform: 'none' }}
      className={`inline-block rounded-[2px] shrink-0 ${className}`}
    />
  );
}
