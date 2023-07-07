import TelemetryReporter from "@vscode/extension-telemetry";
import { Telemetry } from "./types/types";
import { workspace } from "vscode";

const AppinsightsKey = "AIF-d9b70cd4-b9f9-4d70-929b-a071c400b217";
const sharedProperties: Record<string, any> = {};

export function sendTelemetryEvent<
  P extends IEventNamePropertyMapping,
  E extends keyof P
>(
  eventName: E,
  durationMs?: Record<string, number> | number,
  properties?: P[E],
  ex?: Error
) {
  if (isTestExecution() || !isTelemetrySupported() || isTelemetryDisabled()) {
    return;
  }
  const reporter = getTelemetryReporter();
  const measures =
    typeof durationMs === "number"
      ? { duration: durationMs }
      : durationMs
      ? durationMs
      : undefined;
  let customProperties: Record<string, string> = {};
  let eventNameSent = eventName as string;

  if (ex) {
    // When sending telemetry events for exceptions no need to send custom properties.
    // Else we have to review all properties every time as part of GDPR.
    // Assume we have 10 events all with their own properties.
    // As we have errors for each event, those properties are treated as new data items.
    // Hence they need to be classified as part of the GDPR process, and thats unnecessary and onerous.
    eventNameSent = "ERROR";
    customProperties = {
      originalEventName: eventName as string,
      stackTrace: ex.stack || "",
    };
    reporter.sendTelemetryErrorEvent(eventNameSent, customProperties, measures);
  } else {
    if (properties) {
      const data = properties as any;
      Object.getOwnPropertyNames(data).forEach((prop) => {
        if (data[prop] === undefined || data[prop] === null) {
          return;
        }
        try {
          // If there are any errors in serializing one property, ignore that and move on.
          // Else nothing will be sent.
          customProperties[prop] =
            typeof data[prop] === "string"
              ? data[prop]
              : typeof data[prop] === "object"
              ? "object"
              : data[prop].toString();
        } catch (ex) {
          console.error(
            `Failed to serialize ${prop} for ${eventName.toString()}`,
            ex
          );
        }
      });
    }

    // Add shared properties to telemetry props (we may overwrite existing ones).
    Object.assign(customProperties, sharedProperties);

    reporter.sendTelemetryEvent(eventNameSent, customProperties, measures);
  }
}

interface IEventNamePropertyMapping {
  [Telemetry.GatherIsInstalled]: undefined | never;
  [Telemetry.GatherCompleted]: {
    /**
     * result indicates whether the gather was completed to a script, notebook or suffered an internal error.
     */
    result: "err" | "script" | "notebook" | "unavailable";
  };
  [Telemetry.GatherStats]: {
    linesSubmitted: number;
    cellsSubmitted: number;
    linesGathered: number;
    cellsGathered: number;
  };
  [Telemetry.GatherException]: {
    exceptionType: "activate" | "gather" | "log" | "reset";
  };
  /**
   * Telemetry event sent when a gathered notebook has been saved by the user.
   */
  [Telemetry.GatheredNotebookSaved]: undefined | never;
  /**
   * Telemetry event sent when the user reports whether Gathered notebook was good or not
   */
  [Telemetry.GatherQualityReport]: { result: "yes" | "no" };
}

let telemetryReporter: TelemetryReporter | undefined;
function getTelemetryReporter(): TelemetryReporter {
  if (!isTestExecution() && telemetryReporter) {
    return telemetryReporter;
  }

  const reporter = require("@vscode/extension-telemetry")
    .default as typeof TelemetryReporter;
  return (telemetryReporter = new reporter(AppinsightsKey));
}

function isTestExecution(): boolean {
  return process.env.VSC_GATHER_UNIT_TEST === "1";
}

function isTelemetrySupported(): boolean {
  try {
    // tslint:disable-next-line:no-require-imports
    const vsc = require("vscode");
    // tslint:disable-next-line:no-require-imports
    const reporter = require("@vscode/extension-telemetry");
    return vsc !== undefined && reporter !== undefined;
  } catch {
    return false;
  }
}

/**
 * Checks if the telemetry is disabled in user settings
 * @returns {boolean}
 */
function isTelemetryDisabled(): boolean {
  const settings = workspace
    .getConfiguration("telemetry")
    .inspect<boolean>("enableTelemetry")!;
  return settings.globalValue === false ? true : false;
}
