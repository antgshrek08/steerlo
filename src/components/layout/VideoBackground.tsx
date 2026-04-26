type VideoBackgroundProps = {
  src: string;
  videoClassName?: string;
  overlayClassName?: string;
  gradientClassName?: string;
};

export function VideoBackground({
  src,
  videoClassName = "h-full w-full object-cover",
  overlayClassName = "bg-black/70",
  gradientClassName
}: VideoBackgroundProps) {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <video autoPlay muted loop playsInline className={videoClassName}>
        <source src={src} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 ${overlayClassName}`} />
      {gradientClassName ? <div className={`absolute inset-0 ${gradientClassName}`} /> : null}
    </div>
  );
}
