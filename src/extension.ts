import { IGatherProvider } from "./types";
import { GatherProvider } from "./gather";

export function activate() {
  let api = {
    getGatherProvider(): IGatherProvider {
      return new GatherProvider();
    },
  };

  return api;
}

export function deactivate() {}
