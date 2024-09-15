export const debugLog = (...messages: unknown[]): void => {
  if (process.env.NODE_ENV === "test") {
    console.debug(...messages)
  }
}