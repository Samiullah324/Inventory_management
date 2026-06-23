import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ThemeToggle from '../components/ThemeToggle'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

function ThemeProbe() {
  const { theme } = useTheme()
  return <span data-testid="theme-value">{theme}</span>
}

function renderWithTheme(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.setAttribute('data-theme', 'light')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.setAttribute('data-theme', 'light')
  })

  it('defaults to light theme when no preference is stored', () => {
    renderWithTheme(<ThemeProbe />)

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('initializes from localStorage when dark is saved', () => {
    localStorage.setItem('theme', 'dark')

    renderWithTheme(<ThemeProbe />)

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('persists theme changes to localStorage', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Toggle dark mode' }))

    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggles between light and dark modes', async () => {
    const user = userEvent.setup()
    renderWithTheme(
      <>
        <ThemeToggle />
        <ThemeProbe />
      </>,
    )

    const toggle = screen.getByRole('button', { name: 'Toggle dark mode' })

    await user.click(toggle)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await user.click(toggle)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('falls back to light when stored value is invalid', () => {
    localStorage.setItem('theme', 'purple')

    renderWithTheme(<ThemeProbe />)

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
  })
})
