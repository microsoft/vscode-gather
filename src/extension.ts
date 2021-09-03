"use strict";
import {
  commands,
  Disposable,
  notebooks,
  NotebookCell,
  NotebookCellExecutionState,
  NotebookCellExecutionStateChangeEvent,
  Uri,
  window,
  workspace
} from "vscode";
import { Constants, IGatherProvider, KernelStateEventArgs, Telemetry } from "./types/types";
import { GatherProvider } from "./gather";
import { sendTelemetryEvent } from "./telemetry";
import * as localize from './localize';

const registeredButtons: Disposable[] = [];
const gatherProviderMap = new WeakMap<Uri, IGatherProvider>();

export async function activate() {
  try {
    sendTelemetryEvent(Telemetry.GatherIsInstalled);
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

      notebooks.onDidChangeNotebookCellExecutionState((e: NotebookCellExecutionStateChangeEvent) => {
        if (e.state === NotebookCellExecutionState.Idle && e.cell.document.languageId === 'python') {
          const provider = gatherProviderMap.get(e.cell.notebook.uri);
          if (provider) {
            provider.logExecution(e.cell);
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
