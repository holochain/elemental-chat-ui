describe("Elemental Chat Appliction", () => {
  it("Visits the Elemental Chat app", () => {
    cy.visit("/");
    cy.contains("div", "Elemental Chat");
  });
});
