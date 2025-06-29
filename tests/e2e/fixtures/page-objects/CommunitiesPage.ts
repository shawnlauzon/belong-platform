import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class CommunitiesPage extends BasePage {
  readonly loading: Locator
  readonly error: Locator
  readonly communitiesList: Locator

  constructor(page: Page) {
    super(page)
    this.loading = page.getByTestId('loading')
    this.error = page.getByTestId('error')
    this.communitiesList = page.getByTestId('communities-list')
  }

  async goto() {
    await this.page.goto('/communities')
  }

  async waitForCommunities() {
    await this.communitiesList.waitFor({ timeout: 10000 })
  }

  async getCommunityCount() {
    const text = await this.communitiesList.locator('p').first().textContent()
    const match = text?.match(/Total communities: (\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async getCommunityByIndex(index: number) {
    const community = this.communitiesList.locator('li').nth(index)
    const name = await community.locator('strong').textContent()
    const description = await community.locator('p').textContent().catch(() => null)
    return { name, description }
  }

  async getCommunityById(id: string) {
    const community = this.page.getByTestId(`community-${id}`)
    const name = await community.locator('strong').textContent()
    const description = await community.locator('p').textContent().catch(() => null)
    return { name, description }
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