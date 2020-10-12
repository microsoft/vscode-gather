import * as vscode from "vscode";
import * as path from 'path';

export namespace Constants {
  const folderName = path.basename(__dirname);
  export const EXTENSION_ROOT_DIR = folderName === 'client' ? path.join(__dirname, '..', '..') : path.join(__dirname, '..', '..', '..', '..');
  export const GatherExtension = 'ms-python.gather';
  export const DefaultCodeCellMarker = "# %%";
  export const jupyterExtension = 'ms-toolsai.jupyter';
  export const gatherInteractiveCommand = 'gather.gatherCodeInteractive';
  export const gatherWebviewNotebookCommand = 'gather.gatherCodeWebviewNotebook';
  export const gatherNativeNotebookCommand = 'gather.gatherCodeNativeNotebook';
  export const gatherQualityCommand = 'gather.quality';
  export const gatherToScriptSetting = 'gather.gatherToScript';
  export const gatherSpecPathSetting = 'gather.gatherSpecPath';
  export const gatherTooltip = 'Gather the code required to generate this cell into a new notebook';
  export const PYTHON_LANGUAGE = 'python';
  export const defaultCellMarkerSetting = 'jupyter.defaultCellMarker';
  export const openNotebookCommand = 'jupyter.opennotebook';
  export const openPreviewNotebookCommand = 'jupyter.opennotebookInPreviewEditor';
}

export enum Telemetry {
  GatherIsInstalled = 'DS_INTERNAL.GATHER_IS_INSTALLED',
  GatherCompleted = 'DATASCIENCE.GATHER_COMPLETED',
  GatherStats = 'DS_INTERNAL.GATHER_STATS',
  GatherException = 'DS_INTERNAL.GATHER_EXCEPTION',
  GatheredNotebookSaved = 'DATASCIENCE.GATHERED_NOTEBOOK_SAVED',
  GatherQualityReport = 'DS_INTERNAL.GATHER_QUALITY_REPORT',
}

export enum OSType {
  Unknown = 'Unknown',
  Windows = 'Windows',
  OSX = 'OSX',
  Linux = 'Linux'
}

export interface SimpleCell {
  source: string;
  type: string;
}

export interface IGatherProvider {
  logExecution(vscCell: vscode.NotebookCell): void;
  gatherCode(vscCell: vscode.NotebookCell, toScript: boolean, preview: boolean): Promise<void>;
  resetLog(): void;
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
