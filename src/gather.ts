import * as ppa from "@msrvida/python-program-analysis";
import * as path from "path";
import * as uuid from "uuid/v4";
import { window, workspace, StatusBarItem, StatusBarAlignment } from "vscode";
import {
  Constants,
  IGatherProvider,
  CellState,
  ICell as IVscCell,
} from "./types";
import { pathExists } from "./helpers";
import * as util from "util";

export class GatherProvider implements IGatherProvider {
  private _executionSlicer: ppa.ExecutionLogSlicer<ppa.Cell> | undefined;
  private dataflowAnalyzer: ppa.DataflowAnalyzer | undefined;
  private initPromise: Promise<void>;
  private statusBar: StatusBarItem;

  constructor(private readonly extensionPath: string) {
    this.statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
    this.initPromise = this.init();
  }

  public dispose() {
    this.statusBar.dispose();
  }

  public async getLogLength(): Promise<number | undefined> {
    await this.initPromise;

    if (this._executionSlicer) {
      return this._executionSlicer.executionLog.length;
    }
  }

  public async logExecution(vscCell: IVscCell): Promise<void> {
    try {
      await this.initPromise;

      const gatherCell = convertVscToGatherCell(vscCell);

      if (gatherCell) {
        if (this._executionSlicer) {
          this._executionSlicer.logExecution(gatherCell);
        }
      }
    } catch (e) {
      window.showErrorMessage(
        "Gather: Error logging execution on cell:\n" + vscCell.data.source[0],
        e
      );
      throw e;
    }
  }

  public async resetLog(): Promise<void> {
    try {
      await this.initPromise;

      if (this._executionSlicer) {
        this._executionSlicer.reset();
      }
    } catch (e) {
      window.showErrorMessage("Gather: Error resetting log", e);
      throw e;
    }
  }

  /**
   * For a given code cell, returns a string representing a program containing all the code it depends on.
   */
  public gatherCode(vscCell: IVscCell): string {
    if (!this._executionSlicer) {
      return "# %% [markdown]\n## Gather not available";
    }

    this.statusBar.text = "Gathering Code";

    const gatherCell = convertVscToGatherCell(vscCell);
    if (!gatherCell) {
      this.statusBar.text = "";
      return "";
    }

    const settings = workspace.getConfiguration();
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

    this.statusBar.text = "";
    return slice.cellSlices
      .reduce(concat, "")
      .replace(/#%%/g, defaultCellMarker)
      .trim();
  }

  private async init(): Promise<void> {
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

        const settings = workspace.getConfiguration();
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
function convertVscToGatherCell(cell: IVscCell): ppa.Cell | undefined {
  // This should always be true since we only want to log code cells. Putting this here so types match for outputs property
  if (cell.data.cell_type === "code") {
    const result: ppa.Cell = {
      // tslint:disable-next-line no-unnecessary-local-variable
      text: cell.data.source,

      executionCount: cell.data.execution_count,
      executionEventId: uuid(),

      persistentId: cell.id,
      hasError: cell.state === CellState.error,
      // tslint:disable-next-line: no-any
    } as any;
    return result;
  }
}
