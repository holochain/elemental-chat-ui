import { localForageService } from "./localForageService";

export const persistMutation = mutation => {
  return localForageService.setItem(mutation.type, mutation.payload);
};

export const persistState = state => {
  return localForageService.setItem("state", state);
};

export const getPersistedState = key => {
  if (key) {
    return localForageService.getItem(key);
  } else {
    return localForageService.getItems().then(resultObj => {
      return Promise.resolve(Object.values(resultObj));
    });
  }
};

export const deletePersistedState = () => {
  // u decide how to delete cache
};

export const mapToPersistedState = state => {
  console.log(state);
  // whatever your business logic is.
};
