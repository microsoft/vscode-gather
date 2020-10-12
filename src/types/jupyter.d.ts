"use strict";
import { Event, NotebookCell } from "vscode";

export interface IJupyterExtensionApi {
    ready: Promise<void>;
    readonly onKernelPostExecute: Event<NotebookCell>;
    readonly onKernelRestart: Event<void>;
    readonly onOpenWebview: Event<string[]>;
}
