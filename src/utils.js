export function isHoloHosted() {
  return process.env.VUE_APP_CONTEXT === "holo-host";
}

export function isHoloSelfHosted() {
  return process.env.VUE_APP_CONTEXT === "self-hosted";
}

export function toUint8Array(value) {
  if (!!value.type && value.type === "Buffer") {
    return Uint8Array.from(value.data);
  } else {
    return value;
  }
}
