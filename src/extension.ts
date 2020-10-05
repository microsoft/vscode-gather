"use strict";
import * as vscode from "vscode";
import { IGatherProvider, IGatherProviderOld } from "./types/types";
import { GatherProvider } from "./gather";
import { GatherProviderOld } from "./gatherOld";
import { IJupyterExtensionApi } from "./types/jupyter";
import { gatherCommand, gatherTooltip, jupyterExtension } from "./helpers";

export async function activate(context: vscode.ExtensionContext) {
  const jupyter = vscode.extensions.getExtension<IJupyterExtensionApi>(
    jupyterExtension
  );

  if (jupyter) {
    if (!jupyter.isActive) {
      await jupyter.activate();
      await jupyter.exports.ready;
    }

    let provider: IGatherProvider;
    vscode.commands.registerCommand(gatherCommand, (cell: vscode.NotebookCell) => provider.gatherCode(cell));
    vscode.notebook.onDidOpenNotebookDocument((e) => {
      provider = new GatherProvider(context.extensionPath, getLanguages(e));
    });
    jupyter.exports.onKernelRestart(() => provider.resetLog());
    jupyter.exports.onKernelPostExecute(
      (cell: vscode.NotebookCell) => {
        provider.logExecution(cell);
        // add gather button to notebooks
        // https://github.com/microsoft/vscode-github-issue-notebooks/blob/master/src/renderer/icons.tsx
        addGatherButton(cell);
      }
    );
  }
}

export function deactivate() {}

export function getGatherProviderOld(context: vscode.ExtensionContext) {
  let api = {
    getGatherProvider(): IGatherProviderOld {
      return new GatherProviderOld(context.extensionPath);
    },
  };

  return api;
}

function addGatherButton(cell: vscode.NotebookCell) {
  if (
    cell.metadata.runState &&
    cell.metadata.runState !== vscode.NotebookCellRunState.Error
  ) {
    const button = vscode.notebook.createCellStatusBarItem(cell, vscode.NotebookCellStatusBarAlignment.Right);
    button.command = gatherCommand;
    button.text = 'Gather';
    button.tooltip = gatherTooltip;
    button.show();
  }
}

function getLanguages(doc: vscode.NotebookDocument): string[] {
  let languages: string[] = [];
  doc.cells.forEach(cell => {
    if (cell.language) {
      languages.push(cell.language);
    }
  });

  return languages;
}
