import * as ppa from "@msrvida/python-program-analysis";
import * as uuid from "uuid/v4";
import * as vscode from "vscode";
import * as path from 'path';
import { FileType, FileStat, Uri, workspace } from "vscode";
import { error } from "console";
import { Constants, OSType, SimpleCell } from './types/types';

export async function pathExists(
  // the "file" to look for
  filename: string,
  // the file type to expect; if not provided then any file type
  // matches; otherwise a mismatch results in a "false" value
  fileType?: FileType
): Promise<boolean> {
  let stat: FileStat;
  try {
    // Note that we are using stat() rather than lstat().  This
    // means that any symlinks are getting resolved.
    const uri = Uri.file(filename);
    stat = await workspace.fs.stat(uri);
  } catch (err) {
    error(`stat() failed for "${filename}"`, err);
    return false;
  }

  if (fileType === undefined) {
    return true;
  }
  if (fileType === FileType.Unknown) {
    // FileType.Unknown == 0, hence do not use bitwise operations.
    return stat.type === FileType.Unknown;
  }
  return (stat.type & fileType) === fileType;
}

export class StopWatch {
  private started = new Date().getTime();
  public get elapsedTime() {
      return new Date().getTime() - this.started;
  }
  public reset() {
      this.started = new Date().getTime();
  }
}

/**
 * Accumulator to concatenate cell slices for a sliced program, preserving cell structures.
 */
export function concat(existingText: string, newText: ppa.CellSlice): string {
  // Include our cell marker so that cell slices are preserved
  return `${existingText}#%%\n${newText.textSliceLines}\n`;
}

/**
 * This is called to convert VS Code ICells to Gather ICells for logging.
 * @param cell A cell object conforming to the VS Code cell interface
 */
export function convertVscToGatherCell(cell: vscode.NotebookCell): ppa.Cell | undefined {
  let code = '';
  try {
    if (cell.document) {
      code = cell.document.getText();
    } else {
      code = (cell as any).code as string;
    }
  } catch {
    return undefined;
  }
  // This should always be true since we only want to log code cells. Putting this here so types match for outputs property
  const result: ppa.Cell = {
    text: code,

    executionCount: cell.metadata.executionOrder,
    executionEventId: uuid(),

    persistentId: cell.document.uri.fragment,
    hasError: (cell.metadata.runState && cell.metadata.runState === vscode.NotebookCellRunState.Error),
    // tslint:disable-next-line: no-any
  } as any;
  return result;
}

/**
 * Split a string using the cr and lf characters and return them as an array.
 * By default lines are trimmed and empty lines are removed.
 * @param {SplitLinesOptions=} splitOptions - Options used for splitting the string.
 */
export function splitLines(text: string, splitOptions: { trim: boolean; removeEmptyEntries: boolean } = { removeEmptyEntries: true, trim: true }): string[] {
  let lines = text.split(/\r?\n/g);
  if (splitOptions && splitOptions.trim) {
      lines = lines.map((line) => line.trim());
  }
  if (splitOptions && splitOptions.removeEmptyEntries) {
      lines = lines.filter((line) => line.length > 0);
  }
  return lines;
};

export function countCells(lines: string[]): number {
  let cellCount = 0;

  const settings = vscode.workspace.getConfiguration();
  const defaultCellMarker: string = settings ?
    settings.get(Constants.defaultCellMarkerSetting) as string :
    Constants.DefaultCodeCellMarker;

  lines.forEach(line => {
    if (line.indexOf(defaultCellMarker) === 0) {
      cellCount++;
    }
  });
  return cellCount;
}

export function arePathsSame(path1: string, path2: string): boolean {
  path1 = normCase(path1);
  path2 = normCase(path2);
  return path1 === path2;
}

function normCase(filename: string): string {
  filename = path.normalize(filename);
  return getOSType() === OSType.Windows ? filename.toUpperCase() : filename;
}

function getOSType(platform: string = process.platform): OSType {
  if (/^win/.test(platform)) {
      return OSType.Windows;
  } else if (/^darwin/.test(platform)) {
      return OSType.OSX;
  } else if (/^linux/.test(platform)) {
      return OSType.Linux;
  } else {
      return OSType.Unknown;
  }
}

export function createNotebookContent(cells: SimpleCell[]): string {
  const metadata = {
    language_info: {},
    orig_nbformat: 2,
    kernelspec: {
      display_name: '',
      name: ''
    }
  };

  const json = {
    cells: cells.map((cell) => {
      return {
        source: cell.source,
        cell_type: cell.type,
        metadata: {},
        execution_count: 0,
        outputs: []
      };
    }),
    nbformat: 4,
    nbformat_minor: 2,
    metadata: metadata
  };
  return JSON.stringify(json);
}

export function generateCellsFromString(script: string): SimpleCell[] {
  const cells: SimpleCell[] = [];
  const lines = splitLines(script);

  const settings = vscode.workspace.getConfiguration();
  const defaultCellMarker: string = settings ?
    settings.get(Constants.defaultCellMarkerSetting) as string :
    Constants.DefaultCodeCellMarker;

  let cellCode: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (lines[index].indexOf(defaultCellMarker) === 0) {
      for (let j = index + 1; j < lines.length; j++) {
        if (lines[j].indexOf(defaultCellMarker) === 0) {
          cells.push({
            source: cellCode,
            type: 'code'
          });
          cellCode = [];
          index = j - 1;
          break;
        } else {
          cellCode.push(lines[j]);
        }
      }
    }
  }

  cells.push({
    source: cellCode,
    type: 'code'
  });

  return cells;
}
