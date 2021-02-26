import { render, act } from "@testing-library/vue";
import wait from "waait";

export const SCREENSHOT_PATH = "./snapshots";

export const takeSnapshot = async (page, fileName) =>
  page.screenshot({ path: SCREENSHOT_PATH + `/${fileName}.png` });

export async function renderAndWait(ui, ms = 0, options = {}) {
  let queries;
  await act(async () => {
    queries = render(ui, options);
    await wait(ms);
  });
  return queries;
}
