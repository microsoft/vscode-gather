import * as vscode from "vscode";
import * as path from 'path';

export namespace Constants {
  const folderName = path.basename(__dirname);
  export const EXTENSION_ROOT_DIR = folderName === 'client' ? path.join(__dirname, '..', '..') : path.join(__dirname, '..', '..', '..', '..');
  export const GatherExtension = 'ms-python.gather';
  export const DefaultCodeCellMarker = "# %%";
  export const jupyterExtension = 'ms-toolsai.jupyter';
  export const gatherNativeNotebookCommand = 'gather.gatherCodeNativeNotebook';
  export const gatherToScriptSetting = 'gather.gatherToScript';
  export const gatherSpecPathSetting = 'gather.gatherSpecPath';
  export const PYTHON_LANGUAGE = 'python';
  export const defaultCellMarkerSetting = 'jupyter.defaultCellMarker';
  export const openNotebookCommand = 'jupyter.opennotebook';
}

export enum Telemetry {
  GatherIsInstalled = 'DS_INTERNAL.GATHER_IS_INSTALLED',
  GatherCompleted = 'DATASCIENCE.GATHER_COMPLETED',
  GatherStats = 'DS_INTERNAL.GATHER_STATS',
  GatherException = 'DS_INTERNAL.GATHER_EXCEPTION',
  GatheredNotebookSaved = 'DATASCIENCE.GATHERED_NOTEBOOK_SAVED',
  GatherQualityReport = 'DS_INTERNAL.GATHER_QUALITY_REPORT',
}

export type KernelStateEventArgs = {
  resource: vscode.Uri;
  state: KernelState;
  cell?: vscode.NotebookCell;
};

export enum KernelState {
  started,
  executed,
  restarted
}

export enum OSType {
  Unknown = 'Unknown',
  Windows = 'Windows',
  OSX = 'OSX',
  Linux = 'Linux'
}

export interface SimpleCell {
  source: string[];
  type: string;
}

export interface IGatherProvider {
  logExecution(vscCell: vscode.NotebookCell): void;
  gatherCode(vscCell: vscode.NotebookCell, toScript: boolean): Promise<void>;
  resetLog(): void;
}
