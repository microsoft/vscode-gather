import type { nbformat } from "@jupyterlab/coreutils";
import {
  Event,
  NotebookDocument,
  NotebookKernel,
  NotebookEditor,
  NotebookContentProvider,
  NotebookCellMetadata,
  Disposable,
  NotebookDocumentFilter,
  NotebookKernelProvider,
  NotebookCellsChangeEvent,
  NotebookCellOutputsChangeEvent,
  NotebookCellLanguageChangeEvent,
} from "vscode";

export namespace Constants {
  export const DefaultCodeCellMarker = "# %%";
}

export interface IGatherProvider {
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
  | NotebookCellsChangeEvent
  | NotebookCellOutputsChangeEvent
  | NotebookCellLanguageChangeEvent;

export const IVSCodeNotebook = Symbol("IVSCodeNotebook");
export interface IVSCodeNotebook {
  readonly onDidChangeActiveNotebookKernel: Event<{
    document: NotebookDocument;
    kernel: NotebookKernel | undefined;
  }>;
  readonly notebookDocuments: ReadonlyArray<NotebookDocument>;
  readonly onDidOpenNotebookDocument: Event<NotebookDocument>;
  readonly onDidCloseNotebookDocument: Event<NotebookDocument>;
  readonly onDidChangeActiveNotebookEditor: Event<NotebookEditor | undefined>;
  readonly onDidChangeNotebookDocument: Event<NotebookCellChangedEvent>;
  readonly notebookEditors: Readonly<NotebookEditor[]>;
  readonly activeNotebookEditor: NotebookEditor | undefined;
  registerNotebookContentProvider(
    notebookType: string,
    provider: NotebookContentProvider,
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
      transientMetadata: { [K in keyof NotebookCellMetadata]?: boolean };
    }
  ): Disposable;

  registerNotebookKernelProvider(
    selector: NotebookDocumentFilter,
    provider: NotebookKernelProvider
  ): Disposable;
}
