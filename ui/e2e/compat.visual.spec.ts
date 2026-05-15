import { expect, test } from '@playwright/test';

type StoryCase = {
  name: string;
  storyId: string;
  viewport: { width: number; height: number };
};

const stories: StoryCase[] = [
  {
    name: 'desktop',
    storyId: 'compat-surfaces--default',
    viewport: { width: 1440, height: 1500 },
  },
  {
    name: 'mobile',
    storyId: 'compat-surfaces--mobile',
    viewport: { width: 430, height: 1600 },
  },
];

for (const story of stories) {
  test(`compat surfaces ${story.name} visual baseline`, async ({ page }) => {
    await page.setViewportSize(story.viewport);
    await page.goto(`/iframe.html?id=${story.storyId}&viewMode=story`);
    await page.locator('[data-story-ready="true"]').waitFor();
    await expect(page).toHaveScreenshot(`compat-surfaces-${story.name}.png`, {
      animations: 'disabled',
      fullPage: true,
    });
  });
}
