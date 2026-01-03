import Image from 'next/image'
import Link from 'next/link'

type LogoProps = {
  showText?: boolean
  className?: string
}

export default function Logo({ showText = true, className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo-icon.png"
        alt="NJ Property Tax Calculator"
        width={40}
        height={40}
        priority
        className="h-10 w-10"
      />
      {showText && (
        <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          NJ Property Tax Calculator
        </span>
      )}
    </Link>
  )
}

