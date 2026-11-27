interface DashboardIconProps {
  type: string
  className?: string
}

export default function DashboardIcon({ type, className = '' }: DashboardIconProps) {
  const common = {
    className,
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
  }

  if (type === 'organization') {
    return <svg {...common}><rect x="17" y="5" width="14" height="9" /><rect x="5" y="34" width="12" height="9" /><rect x="18" y="34" width="12" height="9" /><rect x="31" y="34" width="12" height="9" /><path d="M24 14v10M11 34v-6h26v6M24 24v10" /></svg>
  }
  if (type === 'departments') {
    return <svg {...common}><rect x="5" y="7" width="38" height="34" /><path d="M14 41V17h20v24M14 25h20M24 17v24M5 13h38" /></svg>
  }
  if (type === 'announcements') {
    return <svg {...common}><path d="M7 29h8l17 8V11L15 19H7zM7 29v9h8M32 18c5 3 5 9 0 12" /></svg>
  }
  if (type === 'notices') {
    return <svg {...common}><rect x="9" y="5" width="30" height="38" /><path d="M16 16h16M16 23h16M16 30h10M16 37h7" /><path d="M33 5v8h6" /></svg>
  }
  if (type === 'meetings') {
    return <svg {...common}><rect x="6" y="9" width="36" height="31" /><path d="M6 18h36M16 5v8M32 5v8M13 25h8M13 32h20" /></svg>
  }
  if (type === 'quick') {
    return <svg {...common}><rect x="6" y="6" width="15" height="15" /><rect x="27" y="6" width="15" height="15" /><rect x="6" y="27" width="15" height="15" /><rect x="27" y="27" width="15" height="15" /></svg>
  }
  if (type === 'support') {
    return <svg {...common}><rect x="8" y="12" width="32" height="25" rx="2" /><path d="M17 12V8h14v4M8 20h32M19 30h10" /></svg>
  }
  if (type === 'policies') {
    return <svg {...common}><path d="M10 5h20l8 8v30H10zM30 5v10h8M16 21h16M16 28h16M16 35h10" /></svg>
  }
  return <svg {...common}><rect x="7" y="9" width="34" height="30" /><path d="M7 18h34M14 14v8M34 14v8M14 25h20M14 32h12" /></svg>
}
