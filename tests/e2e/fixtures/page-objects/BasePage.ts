import { Page, Locator } from '@playwright/test'

export class BasePage {
  readonly page: Page
  readonly navHome: Locator
  readonly navAuth: Locator
  readonly navCommunities: Locator
  readonly navResources: Locator
  readonly navEvents: Locator

  constructor(page: Page) {
    this.page = page
    this.navHome = page.getByRole('link', { name: 'Home' })
    this.navAuth = page.getByRole('link', { name: 'Auth' })
    this.navCommunities = page.getByRole('link', { name: 'Communities' })
    this.navResources = page.getByRole('link', { name: 'Resources' })
    this.navEvents = page.getByRole('link', { name: 'Events' })
  }

  async goto() {
    await this.page.goto('/')
  }

  async navigateToAuth() {
    await this.navAuth.click()
  }

  async navigateToCommunities() {
    await this.navCommunities.click()
  }

  async navigateToResources() {
    await this.navResources.click()
  }

  async navigateToEvents() {
    await this.navEvents.click()
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  async getTitle() {
    return await this.page.title()
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` })
  }
}