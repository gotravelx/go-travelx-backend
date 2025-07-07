import log from "loglevel";

const customLogger = {
  info: (message) => log.info(`INFO: ${message}`),
  warn: (message) => log.warn(`WARN: ${message}`),
  error: (message) => log.error(`ERROR: ${message}`),
};

log.setLevel("info");
export default customLogger;
