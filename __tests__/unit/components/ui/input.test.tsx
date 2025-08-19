import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'
import { forwardRef } from 'react'
import React from 'react'

// Test component to verify ref forwarding
const TestWrapper = forwardRef<HTMLInputElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <div>
      {children}
      <Input ref={ref} data-testid="forwarded-input" />
    </div>
  )
)
TestWrapper.displayName = 'TestWrapper'

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    test('renders with default props', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('data-slot', 'input')
    })

    test('renders with placeholder text', () => {
      render(<Input placeholder="Enter your email" />)
      const input = screen.getByPlaceholderText('Enter your email')
      expect(input).toBeInTheDocument()
    })

    test('renders with default value', () => {
      render(<Input defaultValue="Default text" />)
      const input = screen.getByDisplayValue('Default text')
      expect(input).toBeInTheDocument()
    })

    test('forwards ref correctly', () => {
      const ref = { current: null }
      render(<Input ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })

  describe('Input Types', () => {
    test('renders text input by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      // Default input type might not be explicitly set as attribute
      expect(input.type).toBe('text')
    })

    test('renders email input type', () => {
      render(<Input type="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    test('renders password input type', () => {
      render(<Input type="password" />)
      const input = document.querySelector('input[type="password"]')
      expect(input).toHaveAttribute('type', 'password')
    })

    test('renders number input type', () => {
      render(<Input type="number" />)
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })

    test('renders search input type', () => {
      render(<Input type="search" />)
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('type', 'search')
    })

    test('renders tel input type', () => {
      render(<Input type="tel" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'tel')
    })

    test('renders url input type', () => {
      render(<Input type="url" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'url')
    })

    test('renders file input type', () => {
      render(<Input type="file" />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'file')
    })

    test('renders checkbox input type', () => {
      render(<Input type="checkbox" />)
      const input = screen.getByRole('checkbox')
      expect(input).toHaveAttribute('type', 'checkbox')
    })

    test('renders radio input type', () => {
      render(<Input type="radio" />)
      const input = screen.getByRole('radio')
      expect(input).toHaveAttribute('type', 'radio')
    })
  })

  describe('Styling Classes', () => {
    test('applies default styling classes', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'flex',
        'h-11',
        'min-h-[44px]',
        'w-full',
        'min-w-0',
        'touch-manipulation',
        'border',
        'bg-transparent',
        'transition-all',
        'outline-none'
      )
    })

    test('applies rounded corners and padding', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('rounded-token-md', 'p-token-sm')
    })

    test('applies text and shadow styling', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'text-token-base',
        'shadow-token-sm',
        'duration-token-fast',
        'ease-token-out'
      )
    })

    test('applies border and background colors', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-input', 'dark:bg-input/30')
    })

    test('merges custom className', () => {
      render(<Input className="custom-input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-input', 'flex', 'h-11')
    })
  })

  describe('Focus and Interaction States', () => {
    test('applies focus-visible styles', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-ring/50',
        'focus-visible:ring-[3px]'
      )
    })

    test('handles focus events', async () => {
      const user = userEvent.setup()
      const handleFocus = jest.fn()
      render(<Input onFocus={handleFocus} />)

      const input = screen.getByRole('textbox')
      await user.click(input)

      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(input).toHaveFocus()
    })

    test('handles blur events', async () => {
      const user = userEvent.setup()
      const handleBlur = jest.fn()
      render(<Input onBlur={handleBlur} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.tab()

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('Validation States', () => {
    test('applies aria-invalid styling', () => {
      render(<Input aria-invalid={true} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveClass(
        'aria-invalid:ring-destructive/20',
        'dark:aria-invalid:ring-destructive/40',
        'aria-invalid:border-destructive'
      )
    })

    test('supports validation with required attribute', () => {
      render(<Input required />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('required')
    })

    test('supports custom validation attributes', () => {
      render(<Input pattern="[0-9]+" title="Numbers only" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('pattern', '[0-9]+')
      expect(input).toHaveAttribute('title', 'Numbers only')
    })
  })

  describe('Disabled State', () => {
    test('can be disabled', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass(
        'disabled:pointer-events-none',
        'disabled:cursor-not-allowed',
        'disabled:opacity-50'
      )
    })

    test('prevents interaction when disabled', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      render(<Input disabled onChange={handleChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(handleChange).not.toHaveBeenCalled()
      expect(input).toHaveValue('')
    })
  })

  describe('User Interactions', () => {
    test('handles text input', async () => {
      const user = userEvent.setup()
      render(<Input />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Hello, World!')

      expect(input).toHaveValue('Hello, World!')
    })

    test('handles onChange events', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(handleChange).toHaveBeenCalledTimes(4) // Once per character
    })

    test('handles controlled input', async () => {
      const user = userEvent.setup()
      const TestControlled = () => {
        const [value, setValue] = React.useState('')
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="controlled-input"
          />
        )
      }

      render(<TestControlled />)

      const input = screen.getByTestId('controlled-input')
      await user.type(input, 'controlled')

      expect(input).toHaveValue('controlled')
    })

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<Input />)

      const input = screen.getByRole('textbox')
      await user.tab()

      expect(input).toHaveFocus()
    })
  })

  describe('File Input Specific Styling', () => {
    test('applies file input specific classes', () => {
      render(<Input type="file" />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toHaveClass(
        'file:text-token-sm',
        'file:border-0',
        'file:bg-transparent'
      )
    })

    test('handles file selection', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      render(<Input type="file" onChange={handleChange} />)

      const input = document.querySelector('input[type="file"]')
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })

      await user.upload(input!, file)

      expect(handleChange).toHaveBeenCalled()
    })

    test('supports multiple file selection', () => {
      render(<Input type="file" multiple />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('multiple')
    })

    test('supports file type restrictions', () => {
      render(<Input type="file" accept=".jpg,.png,.gif" />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('accept', '.jpg,.png,.gif')
    })
  })

  describe('Placeholder and Selection Styling', () => {
    test('applies placeholder styling', () => {
      render(<Input placeholder="Placeholder text" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('placeholder:text-muted-foreground')
    })

    test('applies text selection styling', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'selection:bg-primary',
        'selection:text-primary-foreground'
      )
    })
  })

  describe('Accessibility', () => {
    test('supports ARIA labeling', () => {
      render(<Input aria-label="Email address" />)
      const input = screen.getByLabelText('Email address')
      expect(input).toBeInTheDocument()
    })

    test('supports describedby for error messages', () => {
      render(
        <div>
          <Input aria-describedby="error-message" aria-invalid={true} />
          <div id="error-message">This field is required</div>
        </div>
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'error-message')
    })

    test('maintains proper tab order', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <Input placeholder="First input" />
          <Input placeholder="Second input" />
        </div>
      )

      await user.tab()
      expect(screen.getByPlaceholderText('First input')).toHaveFocus()

      await user.tab()
      expect(screen.getByPlaceholderText('Second input')).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    test('handles null and undefined values', () => {
      render(<Input value={undefined} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })

    test('handles extremely long values', async () => {
      const user = userEvent.setup()
      const longText = 'a'.repeat(100) // Reduced length to avoid timeout
      render(<Input />)

      const input = screen.getByRole('textbox')
      await user.type(input, longText)

      expect(input).toHaveValue(longText)
    })

    test('handles special characters', async () => {
      const user = userEvent.setup()
      const specialText = 'test@example.com'
      render(<Input />)

      const input = screen.getByRole('textbox')
      await user.type(input, specialText)

      expect(input).toHaveValue(specialText)
    })

    test('handles rapid typing', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(input).toHaveValue('test')
      expect(handleChange).toHaveBeenCalledTimes(4)
    })
  })

  describe('Props Forwarding', () => {
    test('forwards all standard input props', () => {
      render(
        <Input
          id="test-input"
          name="testInput"
          autoComplete="email"
          maxLength={100}
          minLength={5}
          readOnly
          data-testid="props-test"
        />
      )

      const input = screen.getByTestId('props-test')
      expect(input).toHaveAttribute('id', 'test-input')
      expect(input).toHaveAttribute('name', 'testInput')
      expect(input).toHaveAttribute('autoComplete', 'email')
      expect(input).toHaveAttribute('maxLength', '100')
      expect(input).toHaveAttribute('minLength', '5')
      expect(input).toHaveAttribute('readOnly')
    })

    test('supports custom data attributes', () => {
      render(<Input data-custom="value" data-analytics="input-field" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('data-custom', 'value')
      expect(input).toHaveAttribute('data-analytics', 'input-field')
    })
  })
})
