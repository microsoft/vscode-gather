import * as vscode from "vscode";
import * as path from 'path';
import type { KernelMessage } from '@jupyterlab/services';

export namespace Constants {
  const folderName = path.basename(__dirname);
  export const EXTENSION_ROOT_DIR = folderName === 'client' ? path.join(__dirname, '..', '..') : path.join(__dirname, '..', '..', '..', '..');
  export const GatherExtension = 'ms-python.gather';
  export const PythonExtension = 'ms-python.python';
  export const DefaultCodeCellMarker = "# %%";
  export const jupyterExtension = 'ms-toolsai.jupyter';
  export const gatherWebviewCommand = 'gather.gatherCodeWebview';
  export const gatherNativeNotebookCommand = 'gather.gatherCodeNativeNotebook';
  export const gatherQualityCommand = 'gather.quality';
  export const gatherToScriptSetting = 'gather.gatherToScript';
  export const gatherSpecPathSetting = 'gather.gatherSpecPath';
  export const gatherTooltip = 'Gather the code required to generate this cell into a new notebook';
  export const PYTHON_LANGUAGE = 'python';
  export const defaultCellMarkerSetting = 'jupyter.defaultCellMarker';
  export const openNotebookCommand = 'jupyter.opennotebook';
  // Shoould work on both light and dark themes
  export const gatherButtonHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <defs>
      <style>.canvas{fill:none;opacity:0;}.cls-1{fill:currentColor !important;fill-rule:evenodd;}</style>
  </defs>
  <title>GatherIcon_16x</title>
  <g id="canvas">
      <path class="canvas" d="M16,16H0V0H16Z"/>
  </g>
  <g id="level-1">
      <path class="cls-1" d="M1.5,1,1,1.5v3l.5.5h3L5,4.5v-3L4.5,1ZM2,4V2H4V4ZM1.5,6,1,6.5v3l.5.5h3L5,9.5v-3L4.5,6ZM2,9V7H4V9ZM1,11.5l.5-.5h3l.5.5v3l-.5.5h-3L1,14.5ZM2,12v2H4V12ZM12.5,5l-.5.5v6l.5.5h3l.5-.5v-6L15.5,5ZM15,8H13V6h2Zm0,3H13V9h2ZM9.1,8H6V9H9.1l-1,1,.7.6,1.8-1.8V8.1L8.8,6.3,8.1,7Z"/>
  </g>
</svg>
`;
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
  kernelId: string;
  state: KernelState;
  kernelMetadata?: KernelMessage.IInfoReply;
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
