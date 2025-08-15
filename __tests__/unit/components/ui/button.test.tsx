import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, buttonVariants } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    test('renders with default props', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('data-slot', 'button')
    })

    test('renders with custom className', () => {
      render(<Button className="custom-class">Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    test('forwards ref correctly', () => {
      const ref = { current: null }
      render(<Button ref={ref}>Test</Button>)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    test('spreads additional props', () => {
      render(<Button data-testid="custom-button" aria-label="Custom button">Test</Button>)
      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('aria-label', 'Custom button')
    })
  })

  describe('Variants', () => {
    test('renders default variant correctly', () => {
      render(<Button variant="default">Default</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    test('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-token-primary', 'text-white')
    })

    test('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Destructive</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-token-error', 'text-white')
    })

    test('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'bg-background')
    })

    test('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground')
    })

    test('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    test('renders link variant correctly', () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary', 'underline-offset-4')
    })

    test('renders prime variant with complex styling', () => {
      render(<Button variant="prime">Prime</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('relative', 'overflow-hidden', 'rounded-full', 'text-white')
    })
  })

  describe('Sizes', () => {
    test('renders default size correctly', () => {
      render(<Button size="default">Default Size</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[44px]', 'h-11')
    })

    test('renders small size correctly', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[44px]', 'h-11', 'rounded-token-md')
    })

    test('renders large size correctly', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[48px]', 'h-12')
    })

    test('renders icon size correctly', () => {
      render(<Button size="icon">🔥</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]', 'h-11', 'w-11')
    })

    test('renders xl size correctly', () => {
      render(<Button size="xl">Extra Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('min-h-[48px]', 'h-12', 'rounded-full')
    })
  })

  describe('asChild Prop', () => {
    test('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      const link = screen.getByRole('link', { name: /link button/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveAttribute('data-slot', 'button')
    })

    test('maintains styling when used as child', () => {
      render(
        <Button asChild variant="primary" size="lg">
          <a href="/test">Styled Link</a>
        </Button>
      )
      const link = screen.getByRole('link')
      expect(link).toHaveClass('bg-token-primary', 'text-white', 'min-h-[48px]')
    })

    test('renders as button when asChild is false', () => {
      render(<Button asChild={false}>Regular Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.tagName).toBe('BUTTON')
    })
  })

  describe('Interactions', () => {
    test('handles click events', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('can be disabled', () => {
      render(<Button disabled>Disabled Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })

    test('prevents click when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Keyboard Button</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard('{Enter}')
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('supports space key activation', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Space Button</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard('{ }')
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    test('has proper focus styles', () => {
      render(<Button>Focus Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-ring/50')
    })

    test('supports aria-invalid state', () => {
      render(<Button aria-invalid={true}>Invalid Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-invalid', 'true')
      expect(button).toHaveClass('aria-invalid:ring-destructive/20', 'aria-invalid:border-destructive')
    })

    test('maintains outline focus for accessibility', () => {
      render(<Button>Outline Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('outline-none')
    })

    test('supports screen reader content', () => {
      render(
        <Button>
          <span className="sr-only">Screen reader only</span>
          Visible text
        </Button>
      )
      const button = screen.getByRole('button', { name: /screen reader only visible text/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('Variant Combinations', () => {
    test('combines variant and size correctly', () => {
      render(<Button variant="primary" size="lg">Large Primary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-token-primary', 'text-white', 'min-h-[48px]', 'h-12')
    })

    test('applies custom className with variants', () => {
      render(
        <Button variant="destructive" size="sm" className="custom-spacing">
          Custom Button
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-token-error', 'text-white', 'custom-spacing')
    })
  })

  describe('Edge Cases', () => {
    test('handles empty children', () => {
      render(<Button />)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toBeEmptyDOMElement()
    })

    test('handles null children', () => {
      render(<Button>{null}</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    test('handles complex children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('IconText')
    })

    test('maintains proper button semantics with asChild', () => {
      render(
        <Button asChild>
          <div role="button" tabIndex={0}>Div Button</div>
        </Button>
      )
      const divButton = screen.getByRole('button', { name: /div button/i })
      expect(divButton).toBeInTheDocument()
      expect(divButton.tagName).toBe('DIV')
    })
  })

  describe('buttonVariants Function', () => {
    test('generates correct classes for default variant', () => {
      const classes = buttonVariants({ variant: 'default', size: 'default' })
      expect(classes).toContain('bg-primary')
      expect(classes).toContain('text-primary-foreground')
    })

    test('generates correct classes for variant and size combinations', () => {
      const classes = buttonVariants({ variant: 'destructive', size: 'lg' })
      expect(classes).toContain('bg-token-error')
      expect(classes).toContain('min-h-[48px]')
    })

    test('applies custom className', () => {
      const classes = buttonVariants({ className: 'custom-class' })
      expect(classes).toContain('custom-class')
    })

    test('uses default variants when none provided', () => {
      const classes = buttonVariants()
      expect(classes).toContain('bg-primary')
      expect(classes).toContain('min-h-[44px]')
    })
  })
})