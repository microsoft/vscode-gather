"use strict";
import { Event, NotebookCell, Uri } from "vscode";

// Typings for the code in the python extension
export interface IPythonExtensionApi {
  /**
   * Promise indicating whether all parts of the extension have completed loading or not.
   * @type {Promise<void>}
   * @memberof IExtensionApi
   */
  ready: Promise<void>;
  datascience: {
    readonly onKernelPostExecute: Event<NotebookCell>;
    readonly onKernelRestart: Event<void>;
  };
}
