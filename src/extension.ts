"use strict";
import * as vscode from "vscode";
import { IGatherProvider, ICell, CellState } from "./types/types";
import { GatherProvider } from "./gather";
import { IPythonExtensionApi } from "./types/python";

export async function activate(context: vscode.ExtensionContext) {
  const python = vscode.extensions.getExtension<IPythonExtensionApi>(
    "ms-python.python"
  );

  if (python) {
    if (!python.isActive) {
      await python.activate();
      await python.exports.ready;
    }

    let provider: IGatherProvider;
    vscode.notebook.onDidOpenNotebookDocument((e) => {
      provider = new GatherProvider(context.extensionPath);

      // add gather button to notebooks
      // https://github.com/microsoft/vscode-github-issue-notebooks/blob/master/src/renderer/icons.tsx
      e.cells.forEach((cell) => {
        if (
          cell.metadata.runState &&
          cell.metadata.runState !== vscode.NotebookCellRunState.Error
        ) {
          vscode.notebook.createCellStatusBarItem(cell);
        }
      });
    });
    python.exports.datascience.onKernelRestart(() => provider.resetLog());
    python.exports.datascience.onKernelPostExecute(
      (cell: vscode.NotebookCell) => provider.logExecution(convertCell(cell))
    );
  }

  // let api = {
  //   getGatherProvider(): IGatherProvider {
  //     return new GatherProvider(context.extensionPath);
  //   },
  // };

  // return api;
}

export function deactivate() {}

function convertCell(cell: vscode.NotebookCell): ICell {
  return {
    id: cell.document.uri.toString(),
    file: cell.document.fileName,
    line: 0,
    state: convertCellStatus(cell.metadata.runState),
    data: {
      source: cell.document.getText(),
      execution_count: cell.metadata.executionOrder
        ? cell.metadata.executionOrder
        : 0,
      outputs: [],
      metadata: {},
      cell_type: "code",
    },
  };
}

function convertCellStatus(
  runState: vscode.NotebookCellRunState | undefined
): CellState {
  if (runState && runState === vscode.NotebookCellRunState.Error) {
    return CellState.error;
  }

  return CellState.finished;
}
