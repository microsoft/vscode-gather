import { IGatherProvider } from "./types";
import { GatherProvider } from "./gather";
import { ExtensionContext } from "vscode";

export function activate(context: ExtensionContext) {
  let api = {
    getGatherProvider(): IGatherProvider {
      return new GatherProvider(context.extensionPath);
    },
  };

  return api;
}

export function deactivate() {}
