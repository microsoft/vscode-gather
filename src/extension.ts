"use strict";
import * as vscode from "vscode";
import { Constants, IGatherProvider, KernelState, KernelStateEventArgs, Telemetry } from "./types/types";
import { GatherProvider } from "./gather";
import { IJupyterExtensionApi } from "./types/jupyter";
import { sendTelemetryEvent } from "./telemetry";
import * as localize from './localize';

const registeredButtons: vscode.Disposable[] = [];
const cellStatusBarItems = new Map<vscode.NotebookCell, vscode.NotebookCellStatusBarItem>();
const gatherProviderMap = new Map<string, IGatherProvider>();

export async function activate() {
  try {
    sendTelemetryEvent(Telemetry.GatherIsInstalled);
    const jupyter = vscode.extensions.getExtension<IJupyterExtensionApi>(Constants.jupyterExtension);

    if (jupyter) {
      if (!jupyter.isActive) {
        await jupyter.activate();
        await jupyter.exports.ready;
      }

      // Register command to be executed by native notebooks.
      vscode.commands.registerCommand(Constants.gatherNativeNotebookCommand, async (cell: vscode.NotebookCell) => {
        const id = cell.notebook.uri.toString();
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
        } else {
          vscode.window.showInformationMessage(localize.Common.runCells());
        }
      });

      // Delete the gatherProvider when a notebook is closed.
      vscode.notebook.onDidCloseNotebookDocument((notebook) => {
        if (gatherProviderMap.has(notebook.uri.toString())) {
          gatherProviderMap.delete(notebook.uri.toString());
        }
      });

      // Add a loading message to all cells' status bar. 
      // It will be activated while gather is working.
      vscode.notebook.onDidOpenNotebookDocument((notebook) => {
        notebook.cells.forEach(cell => {
          const item = cellStatusBarItems.get(cell) ?? vscode.notebook.createCellStatusBarItem(cell, vscode.NotebookCellStatusBarAlignment.Right);
          cellStatusBarItems.set(cell, item);
          item.text = localize.Common.gathering();
          item.hide();
        });
      });

      // Register the gather button to be shown on the Jupyter Extension's webviews.
      const button = jupyter.exports.registerCellToolbarButton(
        async (cell: vscode.NotebookCell, isInteractive: boolean, resource: vscode.Uri) => {
          const provider = gatherProviderMap.get(resource.toString());
          if (provider) {
            provider.gatherCode(cell, isInteractive);
          } else {
            vscode.window.showInformationMessage(localize.Common.runCells());
          }
        },
        'gather',
        [vscode.NotebookCellRunState.Success],
        localize.Common.gatherTooltip());
      registeredButtons.push(button);

      // Execute the gather events
      jupyter.exports.onKernelStateChange((nbEvent: KernelStateEventArgs) => {
        if (nbEvent.state === KernelState.started) {
          let language = Constants.PYTHON_LANGUAGE;
          vscode.notebook.visibleNotebookEditors.forEach((ne) => {
            if (ne.document.uri.toString() === nbEvent.resource.toString() && ne.document.languages[0]) {
              language = ne.document.languages[0];
            }
          });

          let provider = new GatherProvider(language);
          gatherProviderMap.set(nbEvent.resource.toString(), provider)
        } else if (nbEvent.state === KernelState.restarted) {
          const provider = gatherProviderMap.get(nbEvent.resource.toString());
          if (provider) {
            provider.resetLog();
          }
        } else if (nbEvent.state === KernelState.executed && nbEvent.cell) {
          const provider = gatherProviderMap.get(nbEvent.resource.toString());
          if (provider) {
            provider.logExecution(nbEvent.cell);
          }
        }
      });
    }
  } catch (e) {
    vscode.window.showErrorMessage(localize.Common.activateError(), e);
    sendTelemetryEvent(Telemetry.GatherException, undefined, { exceptionType: 'activate' });
  }
}

export async function deactivate() {
  registeredButtons.forEach((b) => b.dispose());
  cellStatusBarItems.clear();
  gatherProviderMap.clear();
}
