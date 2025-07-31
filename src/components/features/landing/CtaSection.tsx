'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export function CtaSection() {
  const router = useRouter()

  return (
    <section className="bg-indigo-900 py-20 text-center text-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          className="mb-4 text-4xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Ready to Find Your Home Together?
        </motion.h2>
        <motion.p
          className="mb-8 text-xl text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Stop the endless debates. Start the perfect home search today.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Button
            className="transform rounded-full bg-teal-500 px-8 py-4 text-lg font-semibold text-white transition hover:scale-105 hover:bg-teal-600"
            onClick={() => router.push('/signup')}
          >
            Create Your Household
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
