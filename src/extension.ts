"use strict";
import * as vscode from "vscode";
import { Constants, IGatherProvider, KernelState, KernelStateEventArgs, Telemetry } from "./types/types";
import { GatherProvider } from "./gather";
import { IJupyterExtensionApi } from "./types/jupyter";
import { sendTelemetryEvent } from "./telemetry";
import * as localize from './localize';

const registeredButtons: vscode.Disposable[] = [];

export async function activate() {
  try {
    sendTelemetryEvent(Telemetry.GatherIsInstalled);
    const cellStatusBarItems = new WeakMap<vscode.NotebookCell, vscode.NotebookCellStatusBarItem>();
    const gatherProviderMap = new Map<string, IGatherProvider>();

    const jupyter = vscode.extensions.getExtension<IJupyterExtensionApi>(
      Constants.jupyterExtension
    );

    if (jupyter) {
      if (!jupyter.isActive) {
        await jupyter.activate();
        await jupyter.exports.ready;
      }

      vscode.commands.registerCommand(Constants.gatherWebviewCommand, async (cell: vscode.NotebookCell, isInteractive: boolean, kernelId: string) => {
        const provider = gatherProviderMap.get(kernelId);
        if (provider) {
          provider.gatherCode(cell, isInteractive);
        }
      });
      vscode.commands.registerCommand(Constants.gatherNativeNotebookCommand, async (cell: vscode.NotebookCell) => {
        const id = cell.notebook.metadata.custom?.kernelId;
        const provider = gatherProviderMap.get(id);

        if (provider) {
          const item = cellStatusBarItems.get(cell);
          if (item) {
            item.show();
            await provider.gatherCode(cell, false);
            item.hide();
          } else {
            provider.gatherCode(cell, false);
          }
        }
      });

      vscode.commands.registerCommand(Constants.gatherQualityCommand, (val: string) => {
        sendTelemetryEvent(Telemetry.GatherQualityReport, undefined, { result: val[0] === 'no' ? 'no' : 'yes' });
        vscode.env.openExternal(vscode.Uri.parse(`https://aka.ms/gatherfeedback?succeed=${val[0]}`));
      });

      vscode.notebook.onDidOpenNotebookDocument((notebook) => {
        notebook.cells.forEach(cell => {
          const item = cellStatusBarItems.get(cell) ?? vscode.notebook.createCellStatusBarItem(cell, vscode.NotebookCellStatusBarAlignment.Right);
          cellStatusBarItems.set(cell, item);
          item.text = 'Gathering $(sync~spin)';
          item.hide();
        });
      });

      const button = jupyter.exports.registerCellToolbarButton(Constants.gatherWebviewCommand, Constants.gatherButtonHTML, [vscode.NotebookCellRunState.Success], localize.Common.gatherTooltip());
      registeredButtons.push(button);

      jupyter.exports.onKernelStateChange((nbEvent: KernelStateEventArgs) => {

        if (nbEvent.state === KernelState.started && nbEvent.kernelMetadata) {
          let language = nbEvent.kernelMetadata.language_info.name || Constants.PYTHON_LANGUAGE;
          let provider = new GatherProvider(language);
          gatherProviderMap.set(nbEvent.kernelId, provider)
        } else if (nbEvent.state === KernelState.restarted) {
          const provider = gatherProviderMap.get(nbEvent.kernelId);
          if (provider) {
            provider.resetLog();
          }
        } else if (nbEvent.state === KernelState.executed && nbEvent.cell) {
          const provider = gatherProviderMap.get(nbEvent.kernelId);
          if (provider) {
            provider.logExecution(nbEvent.cell);
          }
        }
      });
    }
  } catch (e) {
    vscode.window.showErrorMessage('Gather: Exception at Activate', e);
    sendTelemetryEvent(Telemetry.GatherException, undefined, { exceptionType: 'activate' });
  }
}

export async function deactivate() {
  registeredButtons.forEach((b) => b.dispose());
}
