import Image from 'next/image';

type Variant = 'home' | 'tradersHero' | 'traderProfileHero';

const VARIANT_STYLES: Record<Variant, { frameClassName: string; imageClassName: string }> = {
  home: {
    frameClassName:
      'relative grid aspect-square w-[104px] place-items-center overflow-visible rounded-3xl',
    imageClassName:
      'h-auto w-[126px] translate-y-3 object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.36)] [mask-image:radial-gradient(circle_at_50%_46%,rgba(0,0,0,1)_61%,rgba(0,0,0,0.96)_78%,transparent_96%),linear-gradient(180deg,rgba(0,0,0,1)_8px,rgba(0,0,0,1)_100%)] [-webkit-mask-image:radial-gradient(circle_at_50%_46%,rgba(0,0,0,1)_61%,rgba(0,0,0,0.96)_78%,transparent_96%),linear-gradient(180deg,rgba(0,0,0,1)_8px,rgba(0,0,0,1)_100%)] [-webkit-mask-composite:source-in] saturate-[1.05] contrast-[1.08]',
  },
  tradersHero: {
    frameClassName:
      'relative grid min-h-[138px] w-full max-w-[112px] place-items-center overflow-visible rounded-3xl',
    imageClassName:
      'h-auto w-[126px] translate-y-2 object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.36)] [mask-image:radial-gradient(circle_at_50%_46%,rgba(0,0,0,1)_61%,rgba(0,0,0,0.96)_78%,transparent_96%),linear-gradient(180deg,rgba(0,0,0,1)_8px,rgba(0,0,0,1)_100%)] [-webkit-mask-image:radial-gradient(circle_at_50%_46%,rgba(0,0,0,1)_61%,rgba(0,0,0,0.96)_78%,transparent_96%),linear-gradient(180deg,rgba(0,0,0,1)_8px,rgba(0,0,0,1)_100%)] [-webkit-mask-composite:source-in] saturate-[1.05] contrast-[1.08] sm:w-[140px] sm:translate-y-3',
  },
  traderProfileHero: {
    frameClassName:
      'relative grid min-h-[138px] w-full max-w-[112px] place-items-center overflow-visible rounded-3xl',
    imageClassName:
      'h-auto w-[122px] translate-y-2 object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.36)] [mask-image:radial-gradient(circle_at_50%_46%,rgba(0,0,0,1)_61%,rgba(0,0,0,0.96)_78%,transparent_96%),linear-gradient(180deg,rgba(0,0,0,1)_8px,rgba(0,0,0,1)_100%)] [-webkit-mask-image:radial-gradient(circle_at_50%_46%,rgba(0,0,0,1)_61%,rgba(0,0,0,0.96)_78%,transparent_96%),linear-gradient(180deg,rgba(0,0,0,1)_8px,rgba(0,0,0,1)_100%)] [-webkit-mask-composite:source-in] saturate-[1.05] contrast-[1.08] sm:w-[136px] sm:translate-y-3',
  },
};

export function MonitorBotIllustration({
  variant,
  className = '',
}: {
  variant: Variant;
  className?: string;
}) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={`${styles.frameClassName} ${className}`.trim()}>
      <Image
        src="/deplexapp-monitor-bot.jpg"
        alt="Monitor trading assistant"
        width={160}
        height={160}
        priority={variant === 'home'}
        className={styles.imageClassName}
      />
    </div>
  );
}
