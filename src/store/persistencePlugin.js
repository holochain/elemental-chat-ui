import { persistMutation } from "./stateMapper";
const mutationsOfInterest = [
  "setAgentKey",
  "setAppInterface",
  "setHolochainClient",
  "setAgentHandle"
];

const ofInterest = mutation => {
  return mutationsOfInterest.includes(mutation);
};

export const persistencePlugin = store => {
  store.subscribe(mutation => {
    if (ofInterest(mutation.type)) {
      persistMutation(mutation).catch(error => {
        error = "";
        console.log(error);
      });
    }
  });
};
