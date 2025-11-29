import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AnimatePresence, motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

function PresenceTabs() {
  const [active, setActive] = useState('one')

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
      </TabsList>

      <AnimatePresence mode="wait">
        {active === 'one' && (
          <TabsContent value="one">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              Tab One
            </motion.div>
          </TabsContent>
        )}

        {active === 'two' && (
          <TabsContent value="two">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              Tab Two
            </motion.div>
          </TabsContent>
        )}
      </AnimatePresence>
    </Tabs>
  )
}

describe('Tabs + AnimatePresence integration', () => {
  it('keeps a single tabpanel mounted and transitions without warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const user = userEvent.setup()

    render(<PresenceTabs />)

    expect(screen.getByText('Tab One')).toBeInTheDocument()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: 'Two' }))
    expect(await screen.findByText('Tab Two')).toBeInTheDocument()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)

    const warnedAboutAnimatePresence = warnSpy.mock.calls.some((call) =>
      call.join(' ').includes('AnimatePresence')
    )
    expect(warnedAboutAnimatePresence).toBe(false)
    warnSpy.mockRestore()
  })
})
