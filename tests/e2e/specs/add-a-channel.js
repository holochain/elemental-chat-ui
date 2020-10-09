describe(`The Elemental Chat app is a bit of a free for all for now. Any person can create a new channel and join any existing channel. Channels are listed on the left side of the screen with their messages in the middle auto scrolling upward when the number of messages is longer than a screen.`, () => {
  it("Add a Channel", () => {
    cy.visit("/");
    cy.get("#add-channel").click();
    cy.get("#channel-name").type("New Public Channel{enter}");
    cy.contains("div", "New Public Channel");
  });
});
