import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { otelConfig } from '../config/index.js';

let sdk: NodeSDK | null = null;

export function initTelemetry(): void {
  if (!otelConfig.enabled) {
    return;
  }

  const traceExporter = new OTLPTraceExporter({
    url: otelConfig.exporterEndpoint,
  });

  sdk = new NodeSDK({
    serviceName: otelConfig.serviceName,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
