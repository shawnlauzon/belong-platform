import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class ResourcesPage extends BasePage {
  readonly loading: Locator
  readonly error: Locator
  readonly resourcesList: Locator

  constructor(page: Page) {
    super(page)
    this.loading = page.getByTestId('loading')
    this.error = page.getByTestId('error')
    this.resourcesList = page.getByTestId('resources-list')
  }

  async goto() {
    await this.page.goto('/resources')
  }

  async waitForResources() {
    await this.resourcesList.waitFor({ timeout: 10000 })
  }

  async getResourceCount() {
    const text = await this.resourcesList.locator('p').first().textContent()
    const match = text?.match(/Total resources: (\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async getResourceByIndex(index: number) {
    const resource = this.resourcesList.locator('li').nth(index)
    const title = await resource.locator('strong').textContent()
    const description = await resource.locator('p').textContent().catch(() => null)
    const category = await resource.locator('small').textContent().catch(() => null)
    return { title, description, category }
  }

  async getResourceById(id: string) {
    const resource = this.page.getByTestId(`resource-${id}`)
    const title = await resource.locator('strong').textContent()
    const description = await resource.locator('p').textContent().catch(() => null)
    const category = await resource.locator('small').textContent().catch(() => null)
    return { title, description, category }
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