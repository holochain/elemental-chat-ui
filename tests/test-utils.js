import { render } from "@testing-library/vue";
import wait from "waait";

export const SCREENSHOT_PATH = "./snapshots";

export const takeSnapshot = async (page, fileName) =>
  page.screenshot({ path: SCREENSHOT_PATH + `/${fileName}.png` });

export async function renderAndWait (ui, ms = 0, options = {}) {
  console.log('>>>>>>>>>>>>>> about to render UI')
  const queries = render(ui, options)
  await wait(ms)
  return queries
}
