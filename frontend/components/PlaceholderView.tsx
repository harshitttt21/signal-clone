"use client";

export default function PlaceholderView({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: JSX.Element;
}) {
  return (
    <div className="flex-1 flex flex-col bg-signal-bg h-full">
      <div className="px-5 py-3 border-b border-signal-border">
        <h1 className="font-bold text-[20px] text-signal-text">{title}</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="w-20 h-20 rounded-full bg-signal-blue/10 flex items-center justify-center mb-4 text-signal-blue">
          {icon}
        </div>
        <p className="text-[17px] font-semibold text-signal-text mb-1">{title}</p>
        <p className="text-sm text-signal-textMuted max-w-[260px]">{subtitle}</p>
        <span className="mt-4 text-[12px] font-medium text-signal-blue bg-signal-blue/10 px-3 py-1.5 rounded-full">
          Coming soon
        </span>
      </div>
    </div>
  );
}
