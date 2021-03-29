"use strict";
import { Disposable, Event, NotebookCell } from "vscode";
import { KernelStateEventArgs, NotebookCellRunState } from './types';

export interface IJupyterExtensionApi {
    ready: Promise<void>;
    readonly onKernelStateChange: Event<KernelStateEventArgs>;
    registerCellToolbarButton(
        callback: (cell: NotebookCell, isInteractive: boolean, resource: Uri) => Promise<void>,
        codicon: string,
        statusToEnable: NotebookCellRunState[],
        tooltip: string
    ): Disposable;
}
