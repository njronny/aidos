/**
 * AIDOS Web UI E2E Tests
 * Tests for enhanced UI features
 */

import { test, expect, chromium } from '@playwright/test';

test.describe('AIDOS Web UI', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to the UI
    await page.goto('/src/ui/index.html');
    
    // Wait for the app to initialize
    await page.waitForLoadState('networkidle');
  });
  
  test.afterEach(async () => {
    await page.close();
  });

  // Test: Login page loads correctly
  test('login page loads correctly', async () => {
    const loginPage = await page.locator('#loginPage');
    await expect(loginPage).toBeVisible();
    
    // Check login form elements
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
  });

  // Test: Login functionality
  test('login with valid credentials', async () => {
    // Enter credentials
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    
    // Click login button
    await page.click('#loginBtn');
    
    // Wait for main app to load
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check that login page is hidden
    const loginPage = await page.locator('#loginPage');
    await expect(loginPage).toHaveClass(/hidden/);
  });

  // Test: New Requirement Modal
  test('new requirement modal opens', async () => {
    // First login
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Click new requirement button
    await page.click('button:has-text("New Requirement")');
    
    // Check modal is visible
    const modal = await page.locator('#newRequirementModal');
    await expect(modal).toHaveClass(/active/);
    
    // Check form elements
    await expect(page.locator('#projectName')).toBeVisible();
    await expect(page.locator('#requirementTitle')).toBeVisible();
    await expect(page.locator('#requirementDesc')).toBeVisible();
    await expect(page.locator('#requirementPriority')).toBeVisible();
  });

  // Test: Modal close functionality
  test('modal closes on cancel', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Open modal
    await page.click('button:has-text("New Requirement")');
    const modal = await page.locator('#newRequirementModal');
    await expect(modal).toHaveClass(/active/);
    
    // Click cancel
    await page.click('button:has-text("Cancel")');
    
    // Modal should close
    await expect(modal).not.toHaveClass(/active/);
  });

  // Test: Dashboard metrics display
  test('dashboard metrics are displayed', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check metrics cards exist
    await expect(page.locator('#totalProjects')).toBeVisible();
    await expect(page.locator('#totalTasks')).toBeVisible();
    await expect(page.locator('#completedTasks')).toBeVisible();
    await expect(page.locator('#runningTasks')).toBeVisible();
    await expect(page.locator('#failedTasks')).toBeVisible();
    await expect(page.locator('#pendingTasks')).toBeVisible();
  });

  // Test: Progress bar exists
  test('progress bar is displayed', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check progress bar exists
    const progressBar = page.locator('.progress-bar');
    await expect(progressBar).toBeVisible();
    
    const progressFill = page.locator('#progressFill');
    await expect(progressFill).toBeVisible();
  });

  // Test: Task filters exist
  test('task filters are available', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check filter buttons
    await expect(page.locator('.filter-btn[data-filter="all"]')).toBeVisible();
    await expect(page.locator('.filter-btn[data-filter="pending"]')).toBeVisible();
    await expect(page.locator('.filter-btn[data-filter="running"]')).toBeVisible();
    await expect(page.locator('.filter-btn[data-filter="completed"]')).toBeVisible();
    await expect(page.locator('.filter-btn[data-filter="failed"]')).toBeVisible();
  });

  // Test: Project list panel exists
  test('projects panel is displayed', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check projects panel
    const projectsPanel = page.locator('.projects-panel');
    await expect(projectsPanel).toBeVisible();
    
    const projectsList = page.locator('#projectsList');
    await expect(projectsList).toBeVisible();
  });

  // Test: Log panel exists
  test('log panel is displayed', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check log panel
    const logPanel = page.locator('.log-panel');
    await expect(logPanel).toBeVisible();
    
    const logContainer = page.locator('#logContainer');
    await expect(logContainer).toBeVisible();
  });

  // Test: Connection status indicator
  test('connection status indicator exists', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check connection status
    const connectionStatus = page.locator('#connectionStatus');
    await expect(connectionStatus).toBeVisible();
    
    const statusDot = connectionStatus.locator('.status-dot');
    await expect(statusDot).toBeVisible();
  });

  // Test: Enhanced form elements
  test('enhanced form has category field', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Open modal
    await page.click('button:has-text("New Requirement")');
    
    // Check category field exists
    const categoryField = page.locator('#requirementCategory');
    await expect(categoryField).toBeVisible();
    
    // Check existing project dropdown exists
    const existingProject = page.locator('#existingProjectId');
    await expect(existingProject).toBeVisible();
  });

  // Test: Error handling - show error toast
  test('error toast can be triggered', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Execute JS to show error toast
    await page.evaluate(() => {
      window.UI.showError('Test Error Message', 'Test Error Details');
    });
    
    // Check error toast is visible
    const errorToast = page.locator('#errorToast');
    await expect(errorToast).toBeVisible();
    
    // Check error message
    await expect(page.locator('.error-message')).toContainText('Test Error Message');
  });

  // Test: Modal can be closed by clicking outside
  test('modal closes on outside click', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Open modal
    await page.click('button:has-text("New Requirement")');
    const modal = await page.locator('#newRequirementModal');
    await expect(modal).toHaveClass(/active/);
    
    // Click outside modal
    await page.click('.app-container', { position: { x: 10, y: 10 } });
    
    // Modal should close
    await expect(modal).not.toHaveClass(/active/);
  });
});

test.describe('AIDOS UI Responsive Design', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 640, height: 480 }
    });
    page = await context.newPage();
    await page.goto('/src/ui/index.html');
    await page.waitForLoadState('networkidle');
  });

  test('mobile responsive layout', async () => {
    // Login first
    await page.fill('#username', 'admin');
    await page.fill('#password', 'aidos123');
    await page.click('#loginBtn');
    await page.waitForSelector('.app-container:not(.hidden)', { timeout: 10000 });
    
    // Check header is visible
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    
    // Check main content is visible
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toBeVisible();
  });
});
