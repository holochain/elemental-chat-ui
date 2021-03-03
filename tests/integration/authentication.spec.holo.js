import App from '@/App.vue'

// dummy placeholder test
describe("Message.vue", () => {
  it("renders props.msg when passed", () => {
    console.log("App: ", App);
    expect(true).toBe(true);
  });
});

// const addChannelBtn = await page.waitForSelector('.mb-1 > .v-toolbar__content > #add-channel > .v-btn__content > .mdi-chat-plus-outline')
// await page.click(addChannelBtn)

// const addChannelSubmitBtn = await page.waitForSelector('.v-input #channel-name')
// await page.click(addChannelSubmitBtn)