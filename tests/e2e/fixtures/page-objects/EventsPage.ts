import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class EventsPage extends BasePage {
  readonly loading: Locator
  readonly error: Locator
  readonly eventsList: Locator

  constructor(page: Page) {
    super(page)
    this.loading = page.getByTestId('loading')
    this.error = page.getByTestId('error')
    this.eventsList = page.getByTestId('events-list')
  }

  async goto() {
    await this.page.goto('/events')
  }

  async waitForEvents() {
    await this.eventsList.waitFor({ timeout: 10000 })
  }

  async getEventCount() {
    const text = await this.eventsList.locator('p').first().textContent()
    const match = text?.match(/Total events: (\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async getEventByIndex(index: number) {
    const event = this.eventsList.locator('li').nth(index)
    const title = await event.locator('strong').textContent()
    const description = await event.locator('p').textContent().catch(() => null)
    const startTime = await event.locator('small').textContent().catch(() => null)
    return { title, description, startTime }
  }

  async getEventById(id: string) {
    const event = this.page.getByTestId(`event-${id}`)
    const title = await event.locator('strong').textContent()
    const description = await event.locator('p').textContent().catch(() => null)
    const startTime = await event.locator('small').textContent().catch(() => null)
    return { title, description, startTime }
  }

  async getError() {
    try {
      return await this.error.textContent()
    } catch {
      return null
    }
  }

  async isLoading() {
    return await this.loading.isVisible()
  }
}