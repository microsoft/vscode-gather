import type { nbformat } from "@jupyterlab/coreutils";
import * as vscode from "vscode";

export namespace Constants {
  export const DefaultCodeCellMarker = "# %%";
}

export interface IGatherProvider {
  logExecution(vscCell: vscode.NotebookCell): void;
  gatherCode(vscCell: vscode.NotebookCell): Promise<string>;
  resetLog(): void;
}

export interface IGatherProviderOld {
  logExecution(vscCell: ICell): void;
  gatherCode(vscCell: ICell): string;
  resetLog(): void;
}

export interface ICell {
  id: string; // This value isn't unique. File and line are needed too.
  file: string;
  line: number;
  state: CellState;
  data:
    | nbformat.ICodeCell
    | nbformat.IRawCell
    | nbformat.IMarkdownCell
    | IMessageCell;
  extraLines?: number[];
}

export enum CellState {
  editing = -1,
  init = 0,
  executing = 1,
  finished = 2,
  error = 3,
}

export interface IMessageCell extends nbformat.IBaseCell {
  cell_type: "messages";
  messages: string[];
}

export type NotebookCellChangedEvent =
  | vscode.NotebookCellsChangeEvent
  | vscode.NotebookCellOutputsChangeEvent
  | vscode.NotebookCellLanguageChangeEvent;

export const IVSCodeNotebook = Symbol("IVSCodeNotebook");
export interface IVSCodeNotebook {
  readonly onDidChangeActiveNotebookKernel: vscode.Event<{
    document: vscode.NotebookDocument;
    kernel: vscode.NotebookKernel | undefined;
  }>;
  readonly notebookDocuments: ReadonlyArray<vscode.NotebookDocument>;
  readonly onDidOpenNotebookDocument: vscode.Event<vscode.NotebookDocument>;
  readonly onDidCloseNotebookDocument: vscode.Event<vscode.NotebookDocument>;
  readonly onDidChangeActiveNotebookEditor: vscode.Event<vscode.NotebookEditor | undefined>;
  readonly onDidChangeNotebookDocument: vscode.Event<NotebookCellChangedEvent>;
  readonly notebookEditors: Readonly<vscode.NotebookEditor[]>;
  readonly activeNotebookEditor: vscode.NotebookEditor | undefined;
  registerNotebookContentProvider(
    notebookType: string,
    provider: vscode.NotebookContentProvider,
    options?: {
      /**
       * Controls if outputs change will trigger notebook document content change and if it will be used in the diff editor
       * Default to false. If the content provider doesn't persisit the outputs in the file document, this should be set to true.
       */
      transientOutputs: boolean;
      /**
       * Controls if a meetadata property change will trigger notebook document content change and if it will be used in the diff editor
       * Default to false. If the content provider doesn't persisit a metadata property in the file document, it should be set to true.
       */
      transientMetadata: { [K in keyof vscode.NotebookCellMetadata]?: boolean };
    }
  ): vscode.Disposable;

  registerNotebookKernelProvider(
    selector: vscode.NotebookDocumentFilter,
    provider: vscode.NotebookKernelProvider
  ): vscode.Disposable;
}
