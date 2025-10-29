(function globalLogger() {
  const isLocal = window && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  window.appLogger = {
    info: (...args) => {
      if (isLocal) console.info(...args);
    },
    warn: (...args) => {
      if (isLocal) console.warn(...args);
    },
    error: (...args) => {
      console.error(...args);
    },
    debug: (...args) => {
      if (isLocal) console.debug(...args);
    },
  };
}());
