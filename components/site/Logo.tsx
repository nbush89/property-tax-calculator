import Image from 'next/image'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'

type LogoProps = {
  showText?: boolean
  className?: string
}

export default function Logo({ showText = true, className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo-light.svg"
        alt={SITE_NAME}
        width={65}
        height={65}
        priority
        className="h-16 w-16"
      />
      {showText && <span className="text-lg font-semibold text-text">Property Tax Calculator</span>}
    </Link>
  )
}
