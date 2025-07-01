import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class CommunitiesPage extends BasePage {
  readonly loading: Locator
  readonly error: Locator
  readonly communitiesList: Locator
  readonly createButton: Locator
  readonly communityForm: Locator
  readonly nameInput: Locator
  readonly descriptionInput: Locator
  readonly submitButton: Locator
  readonly cancelButton: Locator

  constructor(page: Page) {
    super(page)
    this.loading = page.getByTestId('loading')
    this.error = page.getByTestId('error')
    this.communitiesList = page.getByTestId('communities-list')
    this.createButton = page.getByTestId('create-community-button')
    this.communityForm = page.getByTestId('community-form')
    this.nameInput = page.getByTestId('community-name-input')
    this.descriptionInput = page.getByTestId('community-description-input')
    this.submitButton = page.getByTestId('community-submit-button')
    this.cancelButton = page.getByTestId('community-cancel-button')
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

  // CRUD Operations
  async clickCreateButton() {
    await this.createButton.click()
  }

  async fillCommunityForm(name: string, description?: string) {
    await this.nameInput.fill(name)
    if (description) {
      await this.descriptionInput.fill(description)
    }
  }

  async submitForm() {
    await this.submitButton.click()
  }

  async cancelForm() {
    await this.cancelButton.click()
  }

  async editCommunity(id: string) {
    await this.page.getByTestId(`edit-${id}`).click()
  }

  async deleteCommunity(id: string) {
    await this.page.getByTestId(`delete-${id}`).click()
  }

  async joinCommunity(id: string) {
    await this.page.getByTestId(`join-${id}`).click()
  }

  async leaveCommunity(id: string) {
    await this.page.getByTestId(`leave-${id}`).click()
  }

  async isFormVisible() {
    return await this.communityForm.isVisible()
  }

  async isCreateButtonVisible() {
    return await this.createButton.isVisible()
  }

  async hasEditButton(id: string) {
    return await this.page.getByTestId(`edit-${id}`).isVisible()
  }

  async hasDeleteButton(id: string) {
    return await this.page.getByTestId(`delete-${id}`).isVisible()
  }

  async hasJoinButton(id: string) {
    return await this.page.getByTestId(`join-${id}`).isVisible()
  }

  async hasLeaveButton(id: string) {
    return await this.page.getByTestId(`leave-${id}`).isVisible()
  }
}