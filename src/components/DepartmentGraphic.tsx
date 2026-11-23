interface DepartmentGraphicProps {
  type: string
  className?: string
}

export default function DepartmentGraphic({ type, className = '' }: DepartmentGraphicProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 76"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M5 68h86" />
      {type === 'shelves' && <><path d="M16 14v54M80 14v54M16 22h64M16 43h64M16 64h64" /><rect x="23" y="27" width="12" height="12" /><rect x="41" y="27" width="16" height="12" /><rect x="62" y="27" width="11" height="12" /><rect x="24" y="48" width="20" height="12" /><rect x="52" y="48" width="20" height="12" /></>}
      {type === 'factory' && <><path d="M14 68V36l20 12V36l20 12V26l27 15v27zM25 25V10h13v23M65 50h7v10h-7zM29 56h9M47 56h9" /></>}
      {type === 'inspection' && <><path d="M16 14h64v48H16zM16 26h64M16 38h64M16 50h64M28 14v48M40 14v48M52 14v48M64 14v48" /><circle cx="67" cy="50" r="13" fill="#fff" /><path d="m76 59 9 9M62 50h10M67 45v10" /></>}
      {type === 'gear' && <><circle cx="48" cy="40" r="22" /><circle cx="48" cy="40" r="8" /><path d="M48 9v9M48 62v9M17 40h9M70 40h9M26 18l7 7M63 55l7 7M70 18l-7 7M33 55l-7 7M40 11l3 9M53 60l3 9M18 29l9 3M69 48l9 3M77 29l-9 3M27 48l-9 3" /></>}
      {type === 'corporate' && <><path d="M17 66V21h62v45M11 66h74M25 31h9v9h-9zM43 31h9v9h-9zM61 31h9v9h-9zM25 48h9v9h-9zM43 48h9v18h-9zM61 48h9v9h-9zM12 21l36-12 36 12" /></>}
      {type === 'safety' && <><path d="M48 9 76 20v17c0 17-11 27-28 33-17-6-28-16-28-33V20z" /><path d="M48 24v20M48 54v1" /><path d="M31 39h9M56 39h9" /></>}
      {type === 'vessel' && <><path d="M34 10h28v8l8 9v30l-8 9H34l-8-9V27l8-9zM34 18h28M26 54h44M40 10V5h16v5M48 23v25M40 35h16" /><circle cx="48" cy="55" r="5" /></>}
      {type === 'curved-metal' && <><path d="M19 61V45c0-15 13-27 29-27s29 12 29 27v16zM19 61c9-10 19-15 29-15s20 5 29 15M28 61c6-6 13-9 20-9s14 3 20 9" /><path d="M15 68h66M48 18v-8M38 20l-4-7M58 20l4-7" /></>}
      {type === 'digital-grid' && <><rect x="16" y="11" width="64" height="54" /><path d="M16 24h64M16 38h64M16 52h64M29 11v54M43 11v54M57 11v54M71 11v54" /><circle cx="29" cy="24" r="3" fill="currentColor" /><circle cx="57" cy="38" r="3" fill="currentColor" /><circle cx="71" cy="52" r="3" fill="currentColor" /></>}
      {type === 'supply-chain' && <><rect x="9" y="25" width="21" height="20" /><rect x="38" y="12" width="21" height="20" /><rect x="67" y="25" width="20" height="20" /><path d="M19 45v13h58V45M30 35h8M59 22h8M48 32v12M42 39l6 6 6-6" /><path d="M18 58h12M67 58h12" /></>}
      {type === 'technical-documents' && <><path d="M24 9h36l13 13v44H24zM60 9v14h13M34 33h28M34 42h28M34 51h17M34 60h22" /><path d="m13 26-5 5 5 5M83 47l5 5-5 5" /></>}
      {type === 'cad' && <><path d="M13 11h70v54H13zM18 16h60v44H18z" /><path d="M24 52 42 27l13 15 8-9 12 19zM24 22h10M24 27h6M66 22h8M71 27h3" /><circle cx="42" cy="27" r="2" /><circle cx="55" cy="42" r="2" /></>}
      {type === 'growth' && <><path d="M16 63h64M21 57V43h12v14M42 57V31h12v26M63 57V19h12v38" /><path d="m22 34 19-12 13 3 19-14M65 11h8v8" /></>}
      {type === 'structure' && <><path d="M14 66V23h68v43M14 35h68M14 49h68M14 63h68M27 23v43M42 23v43M55 23v43M69 23v43" /><path d="m22 23 10-12h34l10 12" /></>}
      {type === 'schedule' && <><rect x="14" y="12" width="68" height="52" /><path d="M14 25h68M27 12v52M42 12v52M57 12v52M72 12v52M19 33h5M32 33h5M47 33h5M62 33h5M19 45h5M32 45h5M47 45h5M62 45h5M19 57h5M32 57h5M47 57h5" /><path d="M74 40v18" /></>}
      {type === 'construction' && <><path d="M13 66h70M22 66V31M22 31h54M76 31v35M18 31V18h58v13M22 18l12-9 12 9M46 18l12-9 12 9" /><path d="M38 31v35M60 31v35M28 41h8M48 41h8M68 41h4M28 53h8M48 53h8M68 53h4" /></>}
    </svg>
  )
}
