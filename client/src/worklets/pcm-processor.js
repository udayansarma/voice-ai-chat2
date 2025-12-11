class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    // inputs is an array of input channels
    const input = inputs[0];
    if (input && input[0]) {
      // Post the first channel's PCM data
      this.port.postMessage(input[0]);
    }
    // Keep processor alive
    return true;
  }
}

// Register the processor under the name 'pcm-processor'
registerProcessor('pcm-processor', PCMProcessor);
