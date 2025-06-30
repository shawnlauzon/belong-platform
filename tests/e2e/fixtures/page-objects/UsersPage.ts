import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class UsersPage extends BasePage {
  readonly loading: Locator
  readonly error: Locator
  readonly usersList: Locator
  readonly profileSection: Locator
  readonly updateProfileButton: Locator
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly saveButton: Locator

  constructor(page: Page) {
    super(page)
    this.loading = page.getByTestId('loading')
    this.error = page.getByTestId('error')
    this.usersList = page.getByTestId('users-list')
    this.profileSection = page.getByTestId('profile-section')
    this.updateProfileButton = page.getByTestId('update-profile-button')
    this.firstNameInput = page.getByTestId('first-name-input')
    this.lastNameInput = page.getByTestId('last-name-input')
    this.saveButton = page.getByTestId('save-button')
  }

  async goto() {
    await this.page.goto('/users')
  }

  async waitForUsers() {
    await this.usersList.waitFor({ timeout: 10000 })
  }

  async getUserCount() {
    const text = await this.usersList.locator('p').first().textContent()
    const match = text?.match(/Total users: (\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async getUserByIndex(index: number) {
    const user = this.usersList.locator('li').nth(index)
    const name = await user.locator('strong').textContent()
    const email = await user.locator('p').textContent().catch(() => null)
    return { name, email }
  }

  async getUserById(id: string) {
    const user = this.page.getByTestId(`user-${id}`)
    const name = await user.locator('strong').textContent()
    const email = await user.locator('p').textContent().catch(() => null)
    return { name, email }
  }

  async updateProfile(firstName: string, lastName: string) {
    await this.updateProfileButton.click()
    await this.firstNameInput.fill(firstName)
    await this.lastNameInput.fill(lastName)
    await this.saveButton.click()
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