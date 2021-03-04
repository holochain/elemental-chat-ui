import { render } from "@testing-library/vue";
import wait from "waait";

export async function renderAndWait (ui, ms = 0, options = {}) {
  console.log('>>>>>>>>>>>>>> about to render UI')
  const queries = render(ui, options)
  await wait(ms)
  return queries
}
