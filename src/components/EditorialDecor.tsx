import React from 'react';

export const BrandCrest: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
    <path
      d="M7 29.5L9.5 14L15.5 20.5L20 10L24.5 20.5L30.5 14L33 29.5H7Z"
      stroke="#B38B4D"
      strokeWidth="1.4"
      strokeLinejoin="round"
      fill="rgba(179,139,77,0.12)"
    />
    <path d="M9 32.5H31" stroke="#1E2B4A" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="20" cy="7" r="1.6" fill="#B38B4D" />
    <circle cx="9.2" cy="11.5" r="1.2" fill="#B38B4D" />
    <circle cx="30.8" cy="11.5" r="1.2" fill="#B38B4D" />
  </svg>
);

export const EditorialSectionHeading: React.FC<{
  title: string;
  english?: string;
  subtitle?: string;
  align?: 'center' | 'left';
  action?: React.ReactNode;
}> = ({ title, english, subtitle, align = 'center', action }) => {
  if (align === 'left') {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex-1 min-w-[220px]">
          {english && (
            <div className="flex items-center gap-3 mb-1.5">
              <span className="micro-label">{english}</span>
              <span className="h-px w-12 bg-[#D5B984]/80 inline-block" />
            </div>
          )}
          <h2 className="font-editorial text-2xl sm:text-3xl font-semibold tracking-wide text-[#1E2B4A]">
            {title}
          </h2>
          {subtitle && (
            <p className="font-flourish text-sm sm:text-base text-[#7A7267] mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    );
  }

  return (
    <div className="text-center max-w-2xl mx-auto mb-9 px-4">
      <div className="flex items-center justify-center gap-4 mb-2.5">
        <span className="h-px w-14 sm:w-20 bg-gradient-to-r from-transparent to-[#C9AA71]" />
        <BrandCrest className="w-6 h-6 opacity-90" />
        <span className="h-px w-14 sm:w-20 bg-gradient-to-l from-transparent to-[#C9AA71]" />
      </div>
      {english && <p className="micro-label mb-1.5">{english}</p>}
      <h2 className="font-editorial text-2xl sm:text-3xl md:text-[2.1rem] font-semibold tracking-[0.12em] text-[#1E2B4A]">
        {title}
      </h2>
      {subtitle && (
        <p className="font-flourish text-base sm:text-lg text-[#7A7267] mt-2 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export const EditorialIssueStamp: React.FC<{
  current: string;
  total: string;
  captionLines: string[];
}> = ({ current, total, captionLines }) => (
  <div className="hidden xl:flex flex-col items-start select-none text-[#1E2B4A]">
    <div className="issue-numeral text-3xl tracking-tight">{current}</div>
    <div className="w-6 h-px bg-[#1E2B4A]/40 my-1.5" />
    <div className="issue-numeral text-3xl tracking-tight text-[#1E2B4A]/70">{total}</div>
    <div className="mt-3 space-y-0.5">
      {captionLines.map((line, i) => (
        <div key={i} className="text-[10px] tracking-[0.22em] uppercase text-[#7A7267] leading-tight">
          {line}
        </div>
      ))}
    </div>
  </div>
);

export const ArchIconBadge: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  metric?: string;
  onClick?: () => void;
}> = ({ icon, title, subtitle, metric, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col items-center text-center px-4 py-3 transition-transform duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none"
  >
    <div className="arch-frame w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center mb-3.5 text-[#B38B4D] group-hover:text-[#1E2B4A] group-hover:border-[#B38B4D] transition-colors">
      {icon}
    </div>
    <h3 className="font-editorial text-lg sm:text-xl font-semibold text-[#1E2B4A] group-hover:text-[#B38B4D] transition-colors">
      {title}
    </h3>
    <p className="font-flourish text-xs sm:text-sm text-[#7A7267] mt-0.5 max-w-[180px] leading-snug">
      {subtitle}
    </p>
    {metric && (
      <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] bg-[#EFE8DC] text-[#1E2B4A] font-medium">
        {metric}
      </span>
    )}
  </button>
);

export const CurvedArcOverlay: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 800 320"
    fill="none"
    className={`pointer-events-none select-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M-40 90 C 180 200, 460 190, 840 60"
      stroke="rgba(30,43,74,0.12)"
      strokeWidth="1"
    />
    <path
      d="M-20 260 C 260 150, 520 160, 820 280"
      stroke="rgba(179,139,77,0.22)"
      strokeWidth="1"
    />
  </svg>
);
