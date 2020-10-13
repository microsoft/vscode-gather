"use strict";
import { Event, NotebookCell, NotebookCellRunState } from "vscode";

export interface IJupyterExtensionApi {
    ready: Promise<void>;
    readonly onKernelPostExecute: Event<NotebookCell>;
    readonly onKernelRestart: Event<void>;
    readonly onOpenWebview: Event<IWebviewOpenedMessage>;
    registerCellCommand(
        command: string,
        buttonHtml: string,
        statusToEnable: NotebookCellRunState[],
        interactive: boolean
    ): void;
    removeCellCommand(command: string, interactive: boolean): void;
}

export interface IWebviewOpenedMessage {
    languages: string[];
    isInteractive: boolean;
}
