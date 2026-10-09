const { test, expect } = require('@playwright/test');

test.describe('Baithak Multi-User E2E Tests', () => {
  test('3 participants join room, exchange media, chat, host mutes guest, and rejoin cleanly', async ({ browser }) => {
    // Context 1: The Host
    const hostContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    const hostPage = await hostContext.newPage();

    // Register and login host
    await hostPage.goto('/register');
    const uniqueEmail = `host_${Date.now()}@test.com`;
    await hostPage.fill('input[type="text"]', 'Host Master');
    await hostPage.fill('input[type="email"]', uniqueEmail);
    await hostPage.fill('input[placeholder="At least 6 characters"]', 'password123');
    await hostPage.fill('input[placeholder="Repeat password"]', 'password123');
    await hostPage.click('button[type="submit"]');

    // Wait for Dashboard navigation
    await hostPage.waitForURL('**/dashboard');

    // Create a new meeting
    await hostPage.click('button:has-text("+ New Meeting")');
    await hostPage.fill('input[placeholder="e.g. Weekly Team Sync"]', 'E2E Test Sync');
    await hostPage.click('button:has-text("Start Meeting")');

    // Wait for PreJoin screen
    await hostPage.waitForURL(/\/room\/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
    const roomUrl = hostPage.url();
    const roomId = roomUrl.split('/room/')[1].split('/')[0];

    // Host clicks Join Meeting on PreJoin screen
    await hostPage.click('button:has-text("Join Meeting")');
    await hostPage.waitForURL(`**/room/${roomId}/live`);

    // Verify host sees their own local video tile
    await expect(hostPage.locator('video')).toHaveCount(1);

    // Context 2: Guest Alice
    const guest1Context = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    const guest1Page = await guest1Context.newPage();
    await guest1Page.goto(`/room/${roomId}`);
    await guest1Page.fill('input[placeholder="Enter your name"]', 'Guest Alice');
    await guest1Page.click('button:has-text("Join Meeting")');
    await guest1Page.waitForURL(`**/room/${roomId}/live`);

    // Context 3: Guest Bob
    const guest2Context = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    const guest2Page = await guest2Context.newPage();
    await guest2Page.goto(`/room/${roomId}`);
    await guest2Page.fill('input[placeholder="Enter your name"]', 'Guest Bob');
    await guest2Page.click('button:has-text("Join Meeting")');
    await guest2Page.waitForURL(`**/room/${roomId}/live`);

    // 1. Assert all 3 participants see exactly 3 video tiles
    await expect(hostPage.locator('video')).toHaveCount(3, { timeout: 15000 });
    await expect(guest1Page.locator('video')).toHaveCount(3, { timeout: 15000 });
    await expect(guest2Page.locator('video')).toHaveCount(3, { timeout: 15000 });

    // Assert video feeds have rendered frames (videoWidth > 0)
    const hostVideoWidth = await hostPage.locator('video').first().evaluate((el) => el.videoWidth);
    expect(hostVideoWidth).toBeGreaterThan(0);

    // 2. Chat messaging test: Guest Alice sends a message
    await guest1Page.click('button[title="Chat"]');
    await guest1Page.fill('input[placeholder="Send a message..."]', 'Hello team from Alice!');
    await guest1Page.press('input[placeholder="Send a message..."]', 'Enter');

    // Host opens chat to check receipt
    await hostPage.click('button[title="Chat"]');
    await expect(hostPage.locator('text=Hello team from Alice!')).toBeVisible({ timeout: 5000 });

    // Guest Bob opens chat to check receipt
    await guest2Page.click('button[title="Chat"]');
    await expect(guest2Page.locator('text=Hello team from Alice!')).toBeVisible({ timeout: 5000 });

    // 3. Host moderation: Host mutes Guest Alice
    await hostPage.click('button[title="Participants"]');
    const muteAliceButton = hostPage.locator('button[title="Mute participant"]').first();
    await muteAliceButton.click();

    // Alice should receive muted state notification / mic state update
    await expect(guest1Page.locator('button[title="Unmute microphone"]')).toBeVisible({ timeout: 5000 });

    // 4. Refresh and Rejoin: Guest Bob reloads the page
    await guest2Page.reload();
    await guest2Page.fill('input[placeholder="Enter your name"]', 'Guest Bob');
    await guest2Page.click('button:has-text("Join Meeting")');
    await guest2Page.waitForURL(`**/room/${roomId}/live`);

    // Assert no duplicate or phantom tiles exist after reload
    await expect(hostPage.locator('video')).toHaveCount(3, { timeout: 15000 });
    await expect(guest1Page.locator('video')).toHaveCount(3, { timeout: 15000 });
    await expect(guest2Page.locator('video')).toHaveCount(3, { timeout: 15000 });

    // Teardown
    await hostContext.close();
    await guest1Context.close();
    await guest2Context.close();
  });
});
