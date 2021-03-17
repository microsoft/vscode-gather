"use strict";
import * as vscode from "vscode";
import { Constants, IGatherProvider, KernelState, KernelStateEventArgs, Telemetry } from "./types/types";
import { GatherProvider } from "./gather";
import { IJupyterExtensionApi } from "./types/jupyter";
import { sendTelemetryEvent } from "./telemetry";
import * as localize from './localize';

const registeredButtons: vscode.Disposable[] = [];
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
            provider.gatherCode(cell, false);
        } else {
          vscode.window.showInformationMessage(localize.Common.runCells() + ' ' + localize.Common.reopenNotebooks());
        }
      });

      // Delete the gatherProvider when a notebook is closed.
      vscode.notebook.onDidCloseNotebookDocument((notebook) => {
        if (gatherProviderMap.has(notebook.uri.toString())) {
          gatherProviderMap.delete(notebook.uri.toString());
        }
      });

      // Register the gather button to be shown on the Jupyter Extension's webviews.
      const button = jupyter.exports.registerCellToolbarButton(
        async (cell: vscode.NotebookCell, isInteractive: boolean, resource: vscode.Uri) => {
          const provider = gatherProviderMap.get(resource.toString());
          if (provider) {
            provider.gatherCode(cell, isInteractive);
          } else {
            vscode.window.showInformationMessage(localize.Common.runCells() + ' ' + localize.Common.reopenNotebooks());
          }
        },
        'gather',
        [vscode.NotebookCellRunState.Success],
        localize.Common.gatherTooltip()
      );
      registeredButtons.push(button);

      // Execute the gather events
      jupyter.exports.onKernelStateChange((nbEvent: KernelStateEventArgs) => {
        if (nbEvent.state === KernelState.started) {
          let language: string;

          try {
            language = findLanguageInNotebook(nbEvent);
          } catch {
            // Interactive Window case just assumes python
            language = Constants.PYTHON_LANGUAGE;
          }

          let provider = new GatherProvider(language);
          gatherProviderMap.set(nbEvent.resource.toString(), provider);
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
    console.error(e);
  }
}

export async function deactivate() {
  registeredButtons.forEach((b) => b.dispose());
  gatherProviderMap.clear();
}

function findLanguageInNotebook(nbEvent: KernelStateEventArgs): string {
  let language: string | undefined;

  vscode.notebook.notebookDocuments.forEach((doc) => {
    if (doc.uri.toString() === nbEvent.resource.toString()) {
      // try to get the language from the metadata
      if (
          doc.metadata.custom &&
          doc.metadata.custom.metadata &&
          doc.metadata.custom.metadata.language_info &&
          doc.metadata.custom.metadata.language_info.name
      ) {
        language = doc.metadata.custom.metadata.language_info.name;
        return;
      } else {
        // try to get the language from the first cell
        language = doc.cells[0].document.languageId;
        return;
      }
    }
  });

  if (language && language.length > 0) {
    return language;
  }
  return Constants.PYTHON_LANGUAGE;
}
