import localforage from "localforage";
import localforageGetItems from "localforage-getitems";// eslint-disable-line 

export const localForageService = localforage.createInstance({
  name: "holochain",
  version: 1.0,
  storeName: "agent"
});

// THIS style of invocation is what worked for me... not the variant on the gh readme. see https://codepen.io/thgreasi/pen/ojYKeE?editors=1111
localForageService
  .setDriver([
    localforage.INDEXEDDB,
    localforage.WEBSQL,
    localforage.LOCALSTORAGE
  ])
  .catch(error => {
    console.log(error);
  });

export default {
  localForageService
};
