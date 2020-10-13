"use strict";
import * as vscode from "vscode";
import { Constants, IGatherProvider, Telemetry } from "./types/types";
import { GatherProvider } from "./gather";
import { IJupyterExtensionApi, IWebviewOpenedMessage } from "./types/jupyter";
import { sendTelemetryEvent } from "./telemetry";

export async function activate() {
  try {
    sendTelemetryEvent(Telemetry.GatherIsInstalled);
    const cellStatusBarItems = new WeakMap<vscode.NotebookCell, vscode.NotebookCellStatusBarItem>();

    const jupyter = vscode.extensions.getExtension<IJupyterExtensionApi>(
      Constants.jupyterExtension
    );

    if (jupyter) {
      if (!jupyter.isActive) {
        await jupyter.activate();
        await jupyter.exports.ready;
      }

      let provider: IGatherProvider;
      vscode.commands.registerCommand(Constants.gatherInteractiveCommand, async (cell: vscode.NotebookCell) => {
        provider.gatherCode(cell, true, false);
      });
      vscode.commands.registerCommand(Constants.gatherWebviewNotebookCommand, async (cell: vscode.NotebookCell) => {
        provider.gatherCode(cell, false, false);
      });
      vscode.commands.registerCommand(Constants.gatherNativeNotebookCommand, async (cell: vscode.NotebookCell) => {
        const item = cellStatusBarItems.get(cell);
        if (item) {
          item.show();
          await provider.gatherCode(cell, false, true);
          item.hide();
        } else {
          provider.gatherCode(cell, false, true);
        }
      });

      vscode.commands.registerCommand(Constants.gatherQualityCommand, (val: string) => {
        sendTelemetryEvent(Telemetry.GatherQualityReport, undefined, { result: val[0] === 'no' ? 'no' : 'yes' });
        vscode.env.openExternal(vscode.Uri.parse(`https://aka.ms/gatherfeedback?succeed=${val[0]}`));
      });

      vscode.notebook.onDidOpenNotebookDocument((notebook) => {
        provider = new GatherProvider(getLanguages(notebook));

        // if (cell.metadata.runState && cell.metadata.runState !== vscode.NotebookCellRunState.Error && cell.metadata.runState !== vscode.NotebookCellRunState.Idle) {
        // }
        notebook.cells.forEach(cell => {
          const item = cellStatusBarItems.get(cell) ?? vscode.notebook.createCellStatusBarItem(cell, vscode.NotebookCellStatusBarAlignment.Right);
          cellStatusBarItems.set(cell, item);
          item.text = 'Gathering $(sync)';
          item.hide();
        });
      });
      jupyter.exports.onOpenWebview((msg: IWebviewOpenedMessage) => {
        provider = new GatherProvider(msg.languages);

        if (msg.isInteractive) {
          jupyter.exports.registerCellCommand(Constants.gatherInteractiveCommand, Constants.gatherButtonHTML, [vscode.NotebookCellRunState.Success], true);
        } else {
          jupyter.exports.registerCellCommand(Constants.gatherWebviewNotebookCommand, Constants.gatherButtonHTML, [vscode.NotebookCellRunState.Success], false);
        }
      });

      jupyter.exports.onKernelRestart(() => provider.resetLog());
      jupyter.exports.onKernelPostExecute((cell: vscode.NotebookCell) => provider.logExecution(cell));
    }
  } catch (e) {
    vscode.window.showErrorMessage('Gather: Exception at Activate', e);
    sendTelemetryEvent(Telemetry.GatherException, undefined, { exceptionType: 'activate' });
  }
}

export async function deactivate() {
  const jupyter = vscode.extensions.getExtension<IJupyterExtensionApi>(
    Constants.jupyterExtension
  );

  if (jupyter) {
    if (!jupyter.isActive) {
      await jupyter.activate();
      await jupyter.exports.ready;
    }

    jupyter.exports.removeCellCommand(Constants.gatherInteractiveCommand, true);
    jupyter.exports.removeCellCommand(Constants.gatherWebviewNotebookCommand, false);
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
