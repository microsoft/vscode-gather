import * as ppa from "@msrvida/python-program-analysis";
import * as path from "path";
import * as uuid from "uuid/v4";
import * as vscode from "vscode";
import {
  Constants,
  IGatherProvider
} from "./types/types";
import { pathExists, PYTHON_LANGUAGE } from "./helpers";
import * as util from "util";

export class GatherProvider implements IGatherProvider {
  private _executionSlicer: ppa.ExecutionLogSlicer<ppa.Cell> | undefined;
  private dataflowAnalyzer: ppa.DataflowAnalyzer | undefined;
  private initPromise: Promise<void>;

  constructor(private readonly extensionPath: string, private readonly languages: string[]) {
    this.initPromise = this.init();
  }

  public async getLogLength(): Promise<number | undefined> {
    await this.initPromise;

    if (this._executionSlicer) {
      return this._executionSlicer.executionLog.length;
    }
  }

  public async logExecution(vscCell: vscode.NotebookCell): Promise<void> {
    await this.initPromise;

    if (vscCell.language === PYTHON_LANGUAGE) {
      try {
        const gatherCell = convertVscToGatherCell(vscCell);

        if (gatherCell) {
          if (this._executionSlicer) {
            this._executionSlicer.logExecution(gatherCell);
          }
        }
      } catch (e) {
        vscode.window.showErrorMessage(
          "Gather: Error logging execution on cell:\n" + vscCell.document.getText(),
          e
        );
        throw e;
      }
    }

    // if (vscCell.language === 'C#') {
    //   C# work
    // }
  }

  public async resetLog(): Promise<void> {
    await this.initPromise;

    if (this.languages.includes(PYTHON_LANGUAGE)) {
      try {  
        if (this._executionSlicer) {
          this._executionSlicer.reset();
        }
      } catch (e) {
        vscode.window.showErrorMessage("Gather: Error resetting log", e);
        throw e;
      }
    }
    
    // if (this.languages.includes(C#)) {
    //   C# work
    // }
  }

  /**
   * For a given code cell, returns a string representing a program containing all the code it depends on.
   */
  public async gatherCode(vscCell: vscode.NotebookCell): Promise<string> {
    if (vscCell.language === PYTHON_LANGUAGE) {
      if (!this._executionSlicer) {
        return "# %% [markdown]\n## Gather not available";
      }

      const gatherCell = convertVscToGatherCell(vscCell);
      if (!gatherCell) {
        return "";
      }

      const settings = vscode.workspace.getConfiguration();
      let defaultCellMarker: string;
      // Get the default cell marker as we need to replace #%% with it.
      if (settings) {
        defaultCellMarker = settings.get(
          "python.dataScience.defaultCellMarker"
        ) as string;
      } else {
        defaultCellMarker = Constants.DefaultCodeCellMarker;
      }

      // Call internal slice method
      const slice = this._executionSlicer.sliceLatestExecution(
        gatherCell.persistentId
      );

      const gatheredCode = slice.cellSlices
        .reduce(concat, "")
        .replace(/#%%/g, defaultCellMarker)
        .trim();

      const textDoc = await vscode.workspace.openTextDocument({ language: 'python', content: gatheredCode });
      await vscode.window.showTextDocument(textDoc, 1, true);
      return gatheredCode;
    }

    // if (vscCell.language === 'C#') {
    //   C# work
    // }

    return '# %% [markdown]\n## Gather not available in ' + vscCell.language;
  }

  private async init(): Promise<void> {
    if (this.languages.includes(PYTHON_LANGUAGE)) {
      try {
        if (ppa) {
          // If the __builtins__ specs are not available for gather, then no specs have been found. Look in a specific location relative
          // to the extension.
          if (!ppa.getSpecs()) {
            console.error("not found");
            const defaultSpecFolder = path.join(
              this.extensionPath,
              "out",
              "client",
              "gatherSpecs"
            );
            if (await pathExists(defaultSpecFolder)) {
              ppa.setSpecFolder(defaultSpecFolder);
            }
          }
  
          const settings = vscode.workspace.getConfiguration();
          let additionalSpecPath: string | undefined;
          if (settings) {
            // Check to see if any additional specs can be found.
            additionalSpecPath = settings.get(
              "python.dataScience.gatherSpecPath"
            );
          }
  
          if (additionalSpecPath && (await pathExists(additionalSpecPath))) {
            ppa.addSpecFolder(additionalSpecPath);
          } else {
            console.error(
              `Gather: additional spec folder ${additionalSpecPath} but not found.`
            );
          }
  
          // Only continue to initialize gather if we were successful in finding SOME specs.
          if (ppa.getSpecs()) {
            this.dataflowAnalyzer = new ppa.DataflowAnalyzer();
            this._executionSlicer = new ppa.ExecutionLogSlicer(
              this.dataflowAnalyzer
            );
          } else {
            console.error("Gather couldn't find any package specs.");
          }
        }
      } catch (ex) {
        console.error(`Gathering tools could't be activated. ${util.format(ex)}`);
        throw ex;
      }
    }

    // if (this.languages.includes('C#')) {
    //   C# work
    // }
  }
}

/**
 * Accumulator to concatenate cell slices for a sliced program, preserving cell structures.
 */
function concat(existingText: string, newText: ppa.CellSlice): string {
  // Include our cell marker so that cell slices are preserved
  return `${existingText}#%%\n${newText.textSliceLines}\n`;
}

/**
 * This is called to convert VS Code ICells to Gather ICells for logging.
 * @param cell A cell object conforming to the VS Code cell interface
 */
function convertVscToGatherCell(cell: vscode.NotebookCell): ppa.Cell | undefined {
  // This should always be true since we only want to log code cells. Putting this here so types match for outputs property
  // if (cell.data.cell_type === "code") {
    const result: ppa.Cell = {
      // tslint:disable-next-line no-unnecessary-local-variable
      text: cell.document.getText(),

      executionCount: cell.metadata.executionOrder
      ? cell.metadata.executionOrder
      : 0,
      executionEventId: uuid(),

      persistentId: cell.uri.fragment,
      hasError: (cell.metadata.runState && cell.metadata.runState === vscode.NotebookCellRunState.Error),
      // tslint:disable-next-line: no-any
    } as any;
    return result;
  // }
}
