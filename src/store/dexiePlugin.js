export default store => {
  store.subscribe((mutation, state) => {// eslint-disable-line
    // console.log(mutation, state);
  });

  store.subscribeAction({
    before: (action, state) => {// eslint-disable-line
      // console.log("root before", action, state);
    },
    after: (action, state) => {// eslint-disable-line
      // console.log("after", action, state);
    }
  });
};
