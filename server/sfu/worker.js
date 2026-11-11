// Shared mediasoup worker.
//
// One worker per process handles every room. Created lazily on the
// first group call and reused after that; mediasoup's worker binary is
// a separate process so a crash here never takes the API down with it.

const mediasoup = require("mediasoup");
const { workerSettings } = require("./config");

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = mediasoup
      .createWorker(workerSettings)
      .then((worker) => {
        worker.on("died", (error) => {
          console.error(
            "mediasoup worker died (exiting in 2s):",
            error?.message,
          );
          setTimeout(() => process.exit(1), 2000);
        });
        console.log(
          `mediasoup worker created [pid:${worker.pid}, rtc ports ${workerSettings.rtcMinPort}-${workerSettings.rtcMaxPort}]`,
        );
        return worker;
      })
      .catch((err) => {
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

// Graceful shutdown support: no-op until a worker actually exists.
async function closeSfu() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    worker.close();
  } catch {
    // already gone
  }
}

module.exports = { getWorker, closeSfu };
