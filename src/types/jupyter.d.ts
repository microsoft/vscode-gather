"use strict";
import { Disposable, Event, NotebookCell, NotebookCellRunState } from "vscode";
import { KernelStateEventArgs } from './types'

export interface IJupyterExtensionApi {
    ready: Promise<void>;
    readonly onKernelStateChange: Event<KernelStateEventArgs>;
    registerCellToolbarButton(
        buttonId: string,
        callback: (cell: NotebookCell, isInteractive: boolean, notebookId: string) => Promise<void>,
        codicon: string,
        statusToEnable: NotebookCellRunState[],
        tooltip: string
    ): Disposable;
}
