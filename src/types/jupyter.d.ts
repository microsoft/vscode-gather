"use strict";
import { Event, NotebookCell, NotebookCellRunState } from "vscode";
import { IDisposable, NotebookEvent } from './types'

export interface IJupyterExtensionApi {
    ready: Promise<void>;
    readonly onKernelStateChange: Event<NotebookEvent>;
    registerCellToolbarButton(
        command: string,
        buttonHtml: string,
        statusToEnable: NotebookCellRunState[],
        tooltip: string
    ): IDisposable;
}
