"use strict";
import { Event, NotebookCell, NotebookCellRunState } from "vscode";

export interface IJupyterExtensionApi {
    ready: Promise<void>;
    readonly onKernelPostExecute: Event<NotebookCell>;
    readonly onKernelRestart: Event<void>;
    readonly onKernelStart: Event<string[]>;
    registerCellCommand(
        command: string,
        buttonHtml: string,
        statusToEnable: NotebookCellRunState[],
        tooltip: string
    ): void;
    removeCellCommand(command: string): void;
}
