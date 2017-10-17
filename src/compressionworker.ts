import compress from "./compress";
import { config } from "./config";

export function createCompressionWorker(
  metadata: IImpressionMetadata,
  onMessage?: (e: MessageEvent) => void,
  onError?: (e: ErrorEvent) => void
): Worker {
  let worker = null;
  if (Worker) {
    let workerUrl = createWorkerUrl(metadata);
    worker = new Worker(workerUrl);
    worker.onmessage = onMessage || null;
    worker.onerror = onError || null;
  }
  return worker;
}

function workerContext() {
  let workerGlobalScope = self as any;
  let compress = workerGlobalScope.compress;
  let config: IConfig = workerGlobalScope.config;
  let metadata: IImpressionMetadata = workerGlobalScope.metadata;
  let nextBatchEvents: IEvent[] = [];
  let nextBatchBytes = 0;
  let sequence = 0;

  // Edge case: Flag to skip uploading batches consisting of a single XhrError instrumentation event
  // This helps us avoid the infinite loop in the case when all requests fail (e.g. dropped internet connection)
  // Infinite loop comes from sending instrumentation about failing to deliver previous delivery failure instrumentation.
  let nextBatchIsSingleXhrErrorEvent: boolean =  false;

  self.onmessage = (evt: MessageEvent) => {
    let message = evt.data;
    switch (message.type) {
      case WorkerMessageType.AddEvent:
        let addEventMsg = message as IAddEventMessage;
        addEvent(addEventMsg.event, addEventMsg.time);
        break;
      case WorkerMessageType.ForceCompression:
        let forceCompressionMsg = message as ITimestampedWorkerMessage;
        postNextBatchToCore(forceCompressionMsg.time);
        break;
      default:
        break;
    }
  };

  function addEvent(event: IEvent, time: number): void {
    let eventStr = JSON.stringify(event);

    // If appending new event to next batch would exceed batch limit, then post next batch first
    if (nextBatchBytes > 0 && nextBatchBytes + eventStr.length > config.batchLimit) {
      postNextBatchToCore(time);
    }

    // Append new event to the next batch
    nextBatchEvents.push(event);
    nextBatchBytes += eventStr.length;
    nextBatchIsSingleXhrErrorEvent = (nextBatchEvents.length === 1 && event.state && event.state.type === Instrumentation.XhrError);

    // Even if we just posted next batch, it is possible that a single new event exceeds batch limit by itself, so we need to check again
    if (nextBatchBytes >= config.batchLimit) {
      postNextBatchToCore(time);
    }
  }

  function postNextBatchToCore(time: number): void {
    if (nextBatchBytes > 0 && !nextBatchIsSingleXhrErrorEvent) {
      let envelope: IEnvelope = {
        impressionId: metadata.impressionId,
        sequenceNumber: sequence++,
        time
      };
      let payload: IPayload = {
        envelope,
        events: nextBatchEvents,
      };
      if (envelope.sequenceNumber === 0) {
        payload.metadata = metadata;
      }
      let raw = JSON.stringify(payload);
      let compressed = compress(raw);
      let eventCount = nextBatchEvents.length;
      nextBatchEvents = [];
      nextBatchBytes = 0;
      postToCore(compressed, raw, eventCount);
    }
  }

  function postToCore(compressed: string, uncompressed: string, eventCount: number): void {
    let message: ICompressedBatchMessage = {
      type: WorkerMessageType.CompressedBatch,
      compressedData: compressed,
      rawData: uncompressed,
      eventCount
    };

    // Post message to the main thread
    workerGlobalScope.postMessage(message);
  }
}

// Workers are initialized with a URL, pointing to the code which is going to be executed within worker's scope.
// URL can point to file, however we don't want to load a file with worker's code separately, so we create a Blob
// with a string containing worker's code. To build such string, we stitch together string representations of
// all functions and objects that are going to be required within the worker's scope.
// Once Blob is created, we create a URL pointing to it, which can be passed to worker's constructor.
function createWorkerUrl(metadata: IImpressionMetadata): string {
  let workerContextStr = workerContext.toString();
  let workerStr = workerContextStr.substring(workerContextStr.indexOf("{") + 1, workerContextStr.lastIndexOf("}"));
  let code = `self.compress=${compress.toString()};`
            + `self.config=${JSON.stringify(config)};`
            + `self.metadata=${JSON.stringify(metadata)};`
            + workerStr;
  let blob = new Blob([code], {type: "application/javascript"});
  return URL.createObjectURL(blob);
}
