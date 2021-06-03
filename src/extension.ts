"use strict";
import {
  commands,
  Disposable,
  extensions,
  notebooks,
  NotebookCell,
  NotebookCellExecutionState,
  NotebookCellExecutionStateChangeEvent,
  Uri,
  window,
  workspace
} from "vscode";
import { Constants, IGatherProvider, KernelState, KernelStateEventArgs, NotebookCellRunState, Telemetry } from "./types/types";
import { GatherProvider } from "./gather";
import { IJupyterExtensionApi } from "./types/jupyter";
import { sendTelemetryEvent } from "./telemetry";
import * as localize from './localize';

const registeredButtons: Disposable[] = [];
const gatherProviderMap = new WeakMap<Uri, IGatherProvider>();

export async function activate() {
  try {
    sendTelemetryEvent(Telemetry.GatherIsInstalled);
    const jupyter = extensions.getExtension<IJupyterExtensionApi>(Constants.jupyterExtension);

    if (jupyter) {
      if (!jupyter.isActive) {
        await jupyter.activate();
        await jupyter.exports.ready;
      }

      // Register command to be executed by native notebooks.
      commands.registerCommand(Constants.gatherNativeNotebookCommand, async (cell: NotebookCell) => {
        let provider = gatherProviderMap.get(cell.notebook.uri);

        if (provider) {
            provider.gatherCode(cell, false);
        } else {
          let language: string;

          try {
            language = cell.document.languageId;
          } catch {
            // In case of error, default to python
            language = Constants.PYTHON_LANGUAGE;
          }

          provider = new GatherProvider(language);
          provider.gatherWithoutKernel(cell, false);
        }
      });

      // Register smart select command
      commands.registerCommand(Constants.smartSelectCommand, (cell: NotebookCell) => {
        let provider = gatherProviderMap.get(cell.notebook.uri);

        if (provider) {
            provider.smartSelect(cell);
        } else {
          let language: string;

          try {
            language = cell.document.languageId;
          } catch {
            // In case of error, default to python
            language = Constants.PYTHON_LANGUAGE;
          }

          provider = new GatherProvider(language);
          provider.smartSelectWithoutKernel(cell);
        }
      });

      // Create ContextKey for when a notebook has cells selected
      window.onDidChangeNotebookEditorSelection((e) => {
        if (e.selections.length > 0 && !e.selections[0].isEmpty) {
          commands.executeCommand(Constants.setContextCommand, Constants.hasCellsSelected, true);
        } else {
          commands.executeCommand(Constants.setContextCommand, Constants.hasCellsSelected, false);
        }
      });

      // Delete the gatherProvider when a notebook is closed.
      workspace.onDidCloseNotebookDocument((notebook) => {
        if (gatherProviderMap.has(notebook.uri)) {
          gatherProviderMap.delete(notebook.uri);
        }
      });

      // Register the gather button to be shown on the Jupyter Extension's webviews.
      const button = jupyter.exports.registerCellToolbarButton(
        async (cell: NotebookCell, isInteractive: boolean, resource: Uri) => {
          const provider = gatherProviderMap.get(resource);
          if (provider) {
            provider.gatherCode(cell, isInteractive);
          } else {
            window.showInformationMessage(localize.Common.runCells() + ' ' + localize.Common.reopenNotebooks());
          }
        },
        'gather',
        [NotebookCellRunState.Success],
        localize.Common.gatherTooltip()
      );
      registeredButtons.push(button);

      notebooks.onDidChangeNotebookCellExecutionState((e: NotebookCellExecutionStateChangeEvent) => {
        if (e.state === NotebookCellExecutionState.Idle) {
          const provider = gatherProviderMap.get(e.cell.notebook.uri);
          if (provider) {
            provider.logExecution(e.cell);
          }
        }
      });

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
          gatherProviderMap.set(nbEvent.resource, provider);
        } else if (nbEvent.state === KernelState.restarted) {
          const provider = gatherProviderMap.get(nbEvent.resource);
          if (provider) {
            provider.resetLog();
          }
        } else if (nbEvent.state === KernelState.executed && nbEvent.cell) {
          const provider = gatherProviderMap.get(nbEvent.resource);
          if (provider) {
            provider.logExecution(nbEvent.cell);
          }
        }
      });
    }
  } catch (e) {
    window.showErrorMessage(localize.Common.activateError(), e);
    sendTelemetryEvent(Telemetry.GatherException, undefined, { exceptionType: 'activate' });
    console.error(e);
  }
}

export async function deactivate() {
  registeredButtons.forEach((b) => b.dispose());
}

function findLanguageInNotebook(nbEvent: KernelStateEventArgs): string {
  let language: string | undefined;

  workspace.notebookDocuments.forEach((doc) => {
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
        language = doc.cellAt(0).document.languageId;
        return;
      }
    }
  });

  if (language && language.length > 0) {
    return language;
  }
  return Constants.PYTHON_LANGUAGE;
}
