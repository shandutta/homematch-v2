import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// Helper component for testing dialog interactions
const TestDialog = ({
  showCloseButton = true,
  onOpenChange,
  ...props
}: {
  showCloseButton?: boolean
  onOpenChange?: (open: boolean) => void
} & React.ComponentProps<typeof Dialog>) => (
  <Dialog onOpenChange={onOpenChange} {...props}>
    <DialogTrigger asChild>
      <button>Open Dialog</button>
    </DialogTrigger>
    <DialogContent showCloseButton={showCloseButton}>
      <DialogHeader>
        <DialogTitle>Test Dialog</DialogTitle>
        <DialogDescription>This is a test dialog description.</DialogDescription>
      </DialogHeader>
      <div>Dialog content goes here</div>
      <DialogFooter>
        <DialogClose asChild>
          <button>Close</button>
        </DialogClose>
        <button>Save</button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

describe('Dialog Components', () => {
  describe('Dialog', () => {
    test('renders with data-slot attribute', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Trigger</button>
          </DialogTrigger>
        </Dialog>
      )
      
      // Dialog root doesn't render visible content, but trigger should be accessible
      const trigger = screen.getByRole('button', { name: 'Trigger' })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'dialog-trigger')
    })

    test('controls open state', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      
      render(<TestDialog onOpenChange={handleOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      expect(handleOpenChange).toHaveBeenCalledWith(true)
    })

    test('can be controlled externally', () => {
      const { rerender } = render(<TestDialog open={false} />)
      
      expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument()
      
      rerender(<TestDialog open={true} />)
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
    })
  })

  describe('DialogTrigger', () => {
    test('opens dialog when clicked', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
    })

    test('has correct data-slot attribute', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Trigger</button>
          </DialogTrigger>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Trigger' })
      expect(trigger).toHaveAttribute('data-slot', 'dialog-trigger')
    })

    test('supports keyboard activation', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      trigger.focus()
      await user.keyboard('{Enter}')
      
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
    })
  })

  describe('DialogContent', () => {
    test('renders with proper styling and data attributes', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const content = screen.getByText('Test Dialog').closest('[data-slot="dialog-content"]')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass(
        'bg-background',
        'fixed',
        'top-[50%]',
        'left-[50%]',
        'z-50',
        'grid',
        'w-full',
        'max-w-[calc(100%-2rem)]',
        'translate-x-[-50%]',
        'translate-y-[-50%]',
        'gap-4',
        'rounded-lg',
        'border',
        'p-6',
        'shadow-lg',
        'duration-200',
        'sm:max-w-lg'
      )
    })

    test('includes close button by default', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      expect(closeButtons.length).toBeGreaterThan(0)
      expect(closeButtons[0]).toHaveAttribute('data-slot', 'dialog-close')
    })

    test('can hide close button', async () => {
      const user = userEvent.setup()
      render(<TestDialog showCloseButton={false} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      // Should not find the X close button (with svg icon), but the "Close" button in footer should still exist
      const allCloseButtons = document.querySelectorAll('[data-slot="dialog-close"]')
      const xCloseButton = Array.from(allCloseButtons).find(btn => btn.querySelector('svg'))
      expect(xCloseButton).toBeUndefined()
      
      // Footer close button should still exist
      const footerCloseButton = screen.getByRole('button', { name: 'Close' })
      expect(footerCloseButton).toBeInTheDocument()
    })

    test('closes when close button is clicked', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      render(<TestDialog onOpenChange={handleOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      const footerCloseButton = closeButtons.find(btn => btn.getAttribute('data-slot') === 'dialog-close' && !btn.querySelector('svg'))
      await user.click(footerCloseButton!)
      
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    test('supports custom className', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent className="custom-dialog">
            <DialogTitle>Custom Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open' })
      await user.click(trigger)
      
      const content = screen.getByText('Custom Dialog').closest('[data-slot="dialog-content"]')
      expect(content).toHaveClass('custom-dialog')
    })
  })

  describe('DialogOverlay', () => {
    test('renders with correct styling', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')
      expect(overlay).toBeInTheDocument()
      expect(overlay).toHaveClass(
        'fixed',
        'inset-0',
        'z-50',
        'bg-black/50'
      )
    })

    test('closes dialog when clicked', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      render(<TestDialog onOpenChange={handleOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')
      await user.click(overlay!)
      
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('DialogHeader', () => {
    test('renders with proper layout classes', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const header = screen.getByText('Test Dialog').closest('[data-slot="dialog-header"]')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass(
        'flex',
        'flex-col',
        'gap-2',
        'text-center',
        'sm:text-left'
      )
    })

    test('supports custom className', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header">
              <DialogTitle>Custom Header</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open' })
      await user.click(trigger)
      
      const header = screen.getByText('Custom Header').closest('[data-slot="dialog-header"]')
      expect(header).toHaveClass('custom-header')
    })
  })

  describe('DialogTitle', () => {
    test('renders as proper heading element', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const title = screen.getByText('Test Dialog')
      expect(title).toBeInTheDocument()
      expect(title).toHaveAttribute('data-slot', 'dialog-title')
      expect(title).toHaveClass('text-lg', 'leading-none', 'font-semibold')
    })

    test('provides accessible title for dialog', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const dialog = screen.getByRole('dialog')
      const title = screen.getByText('Test Dialog')
      
      expect(dialog).toHaveAccessibleName('Test Dialog')
      expect(title).toBeInTheDocument()
    })
  })

  describe('DialogDescription', () => {
    test('renders with proper styling', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const description = screen.getByText('This is a test dialog description.')
      expect(description).toBeInTheDocument()
      expect(description).toHaveAttribute('data-slot', 'dialog-description')
      expect(description).toHaveClass('text-muted-foreground', 'text-sm')
    })

    test('provides accessible description for dialog', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAccessibleDescription('This is a test dialog description.')
    })
  })

  describe('DialogFooter', () => {
    test('renders with responsive flex layout', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const closeButtons = screen.getAllByRole('button', { name: 'Close' })
      const footerCloseButton = closeButtons.find(btn => btn.getAttribute('data-slot') === 'dialog-close' && !btn.querySelector('svg'))
      const footer = footerCloseButton!.closest('[data-slot="dialog-footer"]')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass(
        'flex',
        'flex-col-reverse',
        'gap-2',
        'sm:flex-row',
        'sm:justify-end'
      )
    })

    test('contains action buttons', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(2) // Footer and X button
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })
  })

  describe('DialogClose', () => {
    test('closes dialog when activated', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      render(<TestDialog onOpenChange={handleOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const closeButtons = screen.getAllByRole('button', { name: 'Close' })
      const footerCloseButton = closeButtons.find(btn => btn.getAttribute('data-slot') === 'dialog-close' && !btn.querySelector('svg'))
      await user.click(footerCloseButton!)
      
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    test('has correct data-slot attribute', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const closeButtons = screen.getAllByRole('button', { name: 'Close' })
      const footerCloseButton = closeButtons.find(btn => btn.getAttribute('data-slot') === 'dialog-close' && !btn.querySelector('svg'))
      expect(footerCloseButton).toHaveAttribute('data-slot', 'dialog-close')
    })
  })

  describe('DialogPortal', () => {
    test('renders content in portal', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      // Portal content is rendered, check for dialog content
      const content = screen.getByText('Test Dialog')
      expect(content).toBeInTheDocument()
      
      // Verify dialog is rendered in a portal (outside the normal DOM tree)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })
  })

  describe('Keyboard Interactions', () => {
    test('closes on Escape key', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      render(<TestDialog onOpenChange={handleOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      await user.keyboard('{Escape}')
      
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    test('traps focus within dialog', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      // Focus should be trapped within the dialog
      const saveButton = screen.getByRole('button', { name: 'Save' })
      const closeButtons = screen.getAllByRole('button', { name: 'Close' })
      
      // Tab should cycle through focusable elements within dialog
      await user.tab()
      await user.tab()
      
      const allFocusableElements = [saveButton, ...closeButtons]
      expect(allFocusableElements).toContain(document.activeElement)
    })

    test('returns focus to trigger when closed', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const closeButtons = screen.getAllByRole('button', { name: 'Close' })
      const footerCloseButton = closeButtons.find(btn => btn.getAttribute('data-slot') === 'dialog-close' && !btn.querySelector('svg'))
      await user.click(footerCloseButton!)
      
      await waitFor(() => {
        expect(trigger).toHaveFocus()
      })
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA attributes', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('role', 'dialog')
    })

    test('supports screen reader navigation', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      // Check that screen reader users can find all important elements
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      expect(screen.getByText('This is a test dialog description.')).toBeInTheDocument()
      expect(screen.getAllByText('Close')).toHaveLength(2) // Footer button + X button sr-only text
    })

    test('close button has screen reader text', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      // Find the X close button (top-right corner)
      const xCloseButtons = screen.getAllByRole('button', { name: /close/i })
      const xCloseButton = xCloseButtons.find(btn => btn.querySelector('.sr-only'))
      expect(xCloseButton).toBeDefined()
      const screenReaderText = xCloseButton!.querySelector('.sr-only')
      expect(screenReaderText).toHaveTextContent('Close')
    })
  })

  describe('Animation Classes', () => {
    test('applies enter and exit animation classes', async () => {
      const user = userEvent.setup()
      render(<TestDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      const content = screen.getByText('Test Dialog').closest('[data-slot="dialog-content"]')
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')
      
      expect(content).toHaveClass(
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95',
        'data-[state=open]:zoom-in-95'
      )
      
      expect(overlay).toHaveClass(
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0'
      )
    })
  })

  describe('Edge Cases', () => {
    test('handles rapid open/close interactions', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      render(<TestDialog onOpenChange={handleOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      
      // Rapidly open and close
      await user.click(trigger)
      await user.keyboard('{Escape}')
      await user.click(trigger)
      await user.keyboard('{Escape}')
      
      expect(handleOpenChange).toHaveBeenCalledTimes(4)
    })

    test('handles nested interactive elements', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open Complex Dialog</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Complex Dialog</DialogTitle>
            <div>
              <input placeholder="Text input" />
              <select>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
              <textarea placeholder="Textarea" />
            </div>
          </DialogContent>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open Complex Dialog' })
      await user.click(trigger)
      
      const input = screen.getByPlaceholderText('Text input')
      const select = screen.getByRole('combobox')
      const textarea = screen.getByPlaceholderText('Textarea')
      
      expect(input).toBeInTheDocument()
      expect(select).toBeInTheDocument()
      expect(textarea).toBeInTheDocument()
      
      // Should be able to interact with all elements
      await user.type(input, 'test')
      expect(input).toHaveValue('test')
    })

    test('handles custom close logic', async () => {
      const user = userEvent.setup()
      const customCloseHandler = jest.fn()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Custom Close Dialog</DialogTitle>
            <button onClick={customCloseHandler}>Custom Close</button>
          </DialogContent>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open' })
      await user.click(trigger)
      
      const customCloseButton = screen.getByRole('button', { name: 'Custom Close' })
      await user.click(customCloseButton)
      
      expect(customCloseHandler).toHaveBeenCalledTimes(1)
    })
  })
})