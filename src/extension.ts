"use strict";
import * as vscode from "vscode";
import { Constants, IDisposable, IGatherProvider, KernelState, NotebookEvent, Telemetry } from "./types/types";
import { GatherProvider } from "./gather";
import { IJupyterExtensionApi } from "./types/jupyter";
import { sendTelemetryEvent } from "./telemetry";
import * as localize from './localize';

const registeredButtons: IDisposable[] = [];

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
      vscode.commands.registerCommand(Constants.gatherWebviewCommand, async (cell: vscode.NotebookCell, isInteractive: boolean) => {
        provider.gatherCode(cell, isInteractive, false);
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

      // vscode.notebook.onDidOpenNotebookDocument((notebook) => {
      //   provider = new GatherProvider(getLanguages(notebook));

      //   // if (cell.metadata.runState && cell.metadata.runState !== vscode.NotebookCellRunState.Error) {
      //   // }
      //   notebook.cells.forEach(cell => {
      //     const item = cellStatusBarItems.get(cell) ?? vscode.notebook.createCellStatusBarItem(cell, vscode.NotebookCellStatusBarAlignment.Right);
      //     cellStatusBarItems.set(cell, item);
      //     item.text = 'Gathering $(sync~spin)';
      //     item.hide();
      //   });
      // });
      jupyter.exports.onKernelStateChange((nbEvent: NotebookEvent) => {
        if (nbEvent.event === KernelState.started && nbEvent.languages) {
          provider = new GatherProvider(nbEvent.languages);

          const button = jupyter.exports.registerCellToolbarButton(Constants.gatherWebviewCommand, Constants.gatherButtonHTML, [vscode.NotebookCellRunState.Success], localize.Common.gatherTooltip());
          registeredButtons.push(button);
        } else if (nbEvent.event === KernelState.restarted) {
          provider.resetLog();
        } else if (nbEvent.event === KernelState.executed && nbEvent.cell) {
          provider.logExecution(nbEvent.cell);
        }
      });
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

    registeredButtons.forEach((b) => b.dispose());
  }
}

// function getLanguages(doc: vscode.NotebookDocument): string[] {
//   let languages: string[] = [];
//   doc.cells.forEach(cell => {
//     if (cell.language) {
//       languages.push(cell.language);
//     }
//   });

//   return languages;
// }
