interface ChevronProps {
  className?: string
}

export default function Chevron({ className = '' }: ChevronProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 44"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 4L25 22L4 40V28L15 22L4 16V4Z" fill="currentColor" />
    </svg>
  )
}
