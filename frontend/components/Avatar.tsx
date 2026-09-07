interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  showOnline?: boolean;
}

export default function Avatar({
  src,
  name,
  size = 44,
  online,
  showOnline = false,
}: AvatarProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bg-signal-blue text-white flex items-center justify-center font-medium"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initials}
        </div>
      )}
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${
            online ? "bg-signal-online" : "bg-gray-300"
          }`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
