'use client'

import RentalCalculator from '@/components/rental-property-calculator'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <main className={`flex min-h-screen flex-col items-center justify-between p-4 md:p-8 max-w-7xl mx-auto ${inter.className}`}>
      <RentalCalculator/>
    </main>
  )
}