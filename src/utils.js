export function isHoloHosted() {
  return process.env.VUE_APP_CONTEXT === "holo-host";
}

export function isHoloSelfHosted() {
  return process.env.VUE_APP_CONTEXT === "self-hosted";
}
