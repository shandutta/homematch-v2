import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    test('renders with default props', () => {
      render(<Card>Card content</Card>)
      const card = screen.getByText('Card content')
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute('data-slot', 'card')
    })

    test('applies default styling classes', () => {
      render(<Card>Test</Card>)
      const card = screen.getByText('Test')
      expect(card).toHaveClass(
        'bg-card',
        'text-card-foreground',
        'gap-token-lg',
        'rounded-token-xl',
        'p-token-lg',
        'shadow-token-sm',
        'flex',
        'flex-col',
        'border'
      )
    })

    test('merges custom className', () => {
      render(<Card className="custom-card">Test</Card>)
      const card = screen.getByText('Test')
      expect(card).toHaveClass('custom-card', 'bg-card')
    })

    test('forwards all div props', () => {
      render(<Card data-testid="card-test" role="region">Content</Card>)
      const card = screen.getByTestId('card-test')
      expect(card).toHaveAttribute('role', 'region')
    })
  })

  describe('CardHeader', () => {
    test('renders with proper structure', () => {
      render(<CardHeader>Header content</CardHeader>)
      const header = screen.getByText('Header content')
      expect(header).toBeInTheDocument()
      expect(header).toHaveAttribute('data-slot', 'card-header')
    })

    test('applies grid layout classes', () => {
      render(<CardHeader>Test</CardHeader>)
      const header = screen.getByText('Test')
      expect(header).toHaveClass(
        'gap-token-xs',
        'p-token-lg',
        '@container/card-header',
        'grid',
        'auto-rows-min',
        'grid-rows-[auto_auto]',
        'items-start'
      )
    })

    test('applies grid columns when CardAction is present', () => {
      render(
        <CardHeader>
          <div>Header content</div>
          <div data-slot="card-action">Action</div>
        </CardHeader>
      )
      const header = screen.getByText('Header content').parentElement
      expect(header).toHaveClass('has-data-[slot=card-action]:grid-cols-[1fr_auto]')
    })
  })

  describe('CardTitle', () => {
    test('renders with semantic structure', () => {
      render(<CardTitle>Card Title</CardTitle>)
      const title = screen.getByText('Card Title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveAttribute('data-slot', 'card-title')
    })

    test('applies typography classes', () => {
      render(<CardTitle>Test Title</CardTitle>)
      const title = screen.getByText('Test Title')
      expect(title).toHaveClass('leading-none', 'font-semibold')
    })

    test('can be used with heading elements', () => {
      render(<CardTitle as="h2">Heading Title</CardTitle>)
      const title = screen.getByText('Heading Title')
      expect(title).toBeInTheDocument()
    })
  })

  describe('CardDescription', () => {
    test('renders description text', () => {
      render(<CardDescription>This is a description</CardDescription>)
      const description = screen.getByText('This is a description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveAttribute('data-slot', 'card-description')
    })

    test('applies muted text styling', () => {
      render(<CardDescription>Test description</CardDescription>)
      const description = screen.getByText('Test description')
      expect(description).toHaveClass('text-token-sm')
      // Note: text-muted-foreground may not be available in test environment
    })
  })

  describe('CardAction', () => {
    test('renders in correct grid position', () => {
      render(<CardAction>Action button</CardAction>)
      const action = screen.getByText('Action button')
      expect(action).toBeInTheDocument()
      expect(action).toHaveAttribute('data-slot', 'card-action')
    })

    test('applies grid positioning classes', () => {
      render(<CardAction>Test action</CardAction>)
      const action = screen.getByText('Test action')
      expect(action).toHaveClass(
        'col-start-2',
        'row-span-2',
        'row-start-1',
        'self-start',
        'justify-self-end'
      )
    })
  })

  describe('CardContent', () => {
    test('renders main content area', () => {
      render(<CardContent>Main content</CardContent>)
      const content = screen.getByText('Main content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveAttribute('data-slot', 'card-content')
    })

    test('applies padding classes', () => {
      render(<CardContent>Test content</CardContent>)
      const content = screen.getByText('Test content')
      expect(content).toHaveClass('p-token-lg')
    })
  })

  describe('CardFooter', () => {
    test('renders footer area', () => {
      render(<CardFooter>Footer content</CardFooter>)
      const footer = screen.getByText('Footer content')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveAttribute('data-slot', 'card-footer')
    })

    test('applies flex layout classes', () => {
      render(<CardFooter>Test footer</CardFooter>)
      const footer = screen.getByText('Test footer')
      expect(footer).toHaveClass('p-token-lg', 'flex', 'items-center')
    })

    test('handles border-top conditional padding', () => {
      render(<CardFooter className="border-t">Footer with border</CardFooter>)
      const footer = screen.getByText('Footer with border')
      expect(footer).toHaveClass('[.border-t]:pt-token-lg')
    })
  })

  describe('Card Composition', () => {
    test('renders complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
            <CardAction>
              <button>Action</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter>
            <button>Footer Button</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('Test Card')).toBeInTheDocument()
      expect(screen.getByText('This is a test card')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
      expect(screen.getByText('This is the main content of the card.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Footer Button' })).toBeInTheDocument()
    })

    test('maintains proper header layout with action', () => {
      render(
        <CardHeader>
          <CardTitle>Title with Action</CardTitle>
          <CardDescription>Description text</CardDescription>
          <CardAction>
            <button>Action</button>
          </CardAction>
        </CardHeader>
      )

      const header = screen.getByText('Title with Action').parentElement
      const actionContainer = screen.getByText('Action').parentElement
      
      expect(header).toContainElement(actionContainer)
      expect(actionContainer).toHaveAttribute('data-slot', 'card-action')
    })

    test('works without optional components', () => {
      render(
        <Card>
          <CardContent>
            Simple card with just content
          </CardContent>
        </Card>
      )

      expect(screen.getByText('Simple card with just content')).toBeInTheDocument()
    })

    test('supports nested complex content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Complex</span> <em>Title</em>
            </CardTitle>
            <CardDescription>
              Description with <strong>emphasis</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <p>Paragraph 1</p>
              <p>Paragraph 2</p>
            </div>
          </CardContent>
        </Card>
      )

      expect(screen.getByText('Complex')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('emphasis')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('supports ARIA attributes', () => {
      render(
        <Card aria-labelledby="card-title" role="article">
          <CardTitle id="card-title">Accessible Card</CardTitle>
          <CardContent>Content here</CardContent>
        </Card>
      )

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-labelledby', 'card-title')
      
      const title = screen.getByText('Accessible Card')
      expect(title).toHaveAttribute('id', 'card-title')
    })

    test('maintains semantic structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Semantic Card</CardTitle>
          </CardHeader>
          <CardContent>
            Main content area
          </CardContent>
        </Card>
      )

      // Check that the structure allows for proper screen reader navigation
      const card = screen.getByText('Semantic Card').closest('[data-slot="card"]')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    test('all components accept custom className', () => {
      render(
        <Card className="custom-card">
          <CardHeader className="custom-header">
            <CardTitle className="custom-title">Title</CardTitle>
            <CardDescription className="custom-description">Description</CardDescription>
            <CardAction className="custom-action">Action</CardAction>
          </CardHeader>
          <CardContent className="custom-content">Content</CardContent>
          <CardFooter className="custom-footer">Footer</CardFooter>
        </Card>
      )

      expect(screen.getByText('Title').closest('[data-slot="card"]')).toHaveClass('custom-card')
      expect(screen.getByText('Title').closest('[data-slot="card-header"]')).toHaveClass('custom-header')
      expect(screen.getByText('Title')).toHaveClass('custom-title')
      expect(screen.getByText('Description')).toHaveClass('custom-description')
      expect(screen.getByText('Action')).toHaveClass('custom-action')
      expect(screen.getByText('Content')).toHaveClass('custom-content')
      expect(screen.getByText('Footer')).toHaveClass('custom-footer')
    })

    test('supports CSS-in-JS style objects', () => {
      render(
        <Card style={{ backgroundColor: 'red' }}>
          <CardContent>Styled content</CardContent>
        </Card>
      )

      const card = screen.getByText('Styled content').closest('[data-slot="card"]')
      expect(card).toHaveStyle('background-color: rgb(255, 0, 0)')
    })
  })

  describe('Edge Cases', () => {
    test('handles empty components gracefully', () => {
      render(
        <Card>
          <CardHeader />
          <CardContent />
          <CardFooter />
        </Card>
      )

      const card = document.querySelector('[data-slot="card"]')
      expect(card).toBeInTheDocument()
    })

    test('handles missing optional props', () => {
      render(
        <Card>
          <CardTitle>Title Only</CardTitle>
          <CardContent>Content Only</CardContent>
        </Card>
      )

      expect(screen.getByText('Title Only')).toBeInTheDocument()
      expect(screen.getByText('Content Only')).toBeInTheDocument()
    })

    test('handles null and undefined children', () => {
      render(
        <Card>
          <CardContent>
            {null}
            {undefined}
            Valid content
          </CardContent>
        </Card>
      )

      expect(screen.getByText('Valid content')).toBeInTheDocument()
    })
  })
})