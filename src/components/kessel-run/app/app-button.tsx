'use client';
import { Button as BaseButton } from '@base-ui/react/button';
export function AppButton({ static: stationary = false, ...props }: React.ComponentProps<typeof BaseButton> & { static?: boolean }) {
  return <BaseButton {...props} className={`kr-action ${props.className ?? ''}`} data-static={stationary || undefined} />;
}
