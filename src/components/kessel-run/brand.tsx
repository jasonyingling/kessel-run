import type { SVGProps } from 'react';

type KesselRunMarkProps = Pick<SVGProps<SVGSVGElement>, 'width' | 'height' | 'className'> & {
  /** Omit beside visible brand text; provide a name for standalone use. */
  label?: string;
};

/** Keep these paths synchronized with public/kessel-run-mark.svg. */
export function KesselRunMark({ width = 28, height = 28, className, label }: KesselRunMarkProps) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={width} height={height} fill="currentColor" className={className} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} focusable="false">
    <path d="M4 5h5v22H4z" />
    <path d="m11 14 10-9h7L16 16l12 11h-7L11 18z" />
  </svg>;
}
