import { TIMEOUT } from "./globals";

export const closeTestConductor = (agent, testName) => {
  try {
    agent.kill();
  } catch (err) {
    throw new Error(
      `Error when killing conductor for the ${testName} test : ${err}`
    );
  }
};

export const waitZomeResult = async (
  asyncCheck,
  timeout = TIMEOUT,
  pollingInterval = 1000
) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Waited for ${timeout / 1000} seconds`, timeout));
    }, timeout);
    const poll = setInterval(async () => {
      const callResultRaw = await asyncCheck();
      console.log("callResultRaw >>>>>", callResultRaw);
      console.log("callResultRaw.Ok :", callResultRaw.Ok);
      const callResult = callResultRaw.Ok;
      if (callResult) {
        clearInterval(poll);
        clearTimeout(timeoutId);
        resolve(callResult);
      }
    }, pollingInterval);
  });
};
