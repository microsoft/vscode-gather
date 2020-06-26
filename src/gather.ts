import * as ppatypes from "@msrvida/python-program-analysis";
import * as path from "path";
import * as uuid from "uuid/v4";
import { workspace } from "vscode";
import {
  Constants,
  IGatherProvider,
  CellState,
  ICell as IVscCell,
} from "./types";
import { log } from "console";
import { pathExists } from "./helpers";

export class GatherProvider implements IGatherProvider {
  private _executionSlicer:
    | ppatypes.ExecutionLogSlicer<ppatypes.Cell>
    | undefined;
  private dataflowAnalyzer: ppatypes.DataflowAnalyzer | undefined;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  public async logExecution(vscCell: IVscCell): Promise<void> {
    await this.initPromise;

    const gatherCell = convertVscToGatherCell(vscCell);

    if (gatherCell) {
      if (this._executionSlicer) {
        this._executionSlicer.logExecution(gatherCell);
      }
    }
  }

  public async resetLog(): Promise<void> {
    await this.initPromise;

    if (this._executionSlicer) {
      this._executionSlicer.reset();
    }
  }

  /**
   * For a given code cell, returns a string representing a program containing all the code it depends on.
   */
  public gatherCode(vscCell: IVscCell): string {
    if (!this._executionSlicer) {
      return "# %% [markdown]\n## Gather not available";
    }

    const gatherCell = convertVscToGatherCell(vscCell);
    if (!gatherCell) {
      return "";
    }

    const settings = workspace.getConfiguration();
    // Get the default cell marker as we need to replace #%% with it.
    const defaultCellMarker =
      (settings.get("python.dataScience.defaultCellMarker") as string) ||
      Constants.DefaultCodeCellMarker;

    // Call internal slice method
    const slice = this._executionSlicer.sliceLatestExecution(
      gatherCell.persistentId
    );
    return slice.cellSlices
      .reduce(concat, "")
      .replace(/#%%/g, defaultCellMarker);
  }

  private async init(): Promise<void> {
    try {
      const ppa = require("@msrvida/python-program-analysis");

      if (ppa) {
        // If the __builtins__ specs are not available for gather, then no specs have been found. Look in a specific location relative
        // to the extension.
        if (!ppa.getSpecs()) {
          const defaultSpecFolder = path.join(__dirname, "gatherSpecs");
          if (await pathExists(defaultSpecFolder)) {
            ppa.setSpecFolder(defaultSpecFolder);
          }
        }

        const settings = workspace.getConfiguration();
        // Check to see if any additional specs can be found.
        const additionalSpecPath: string | undefined = settings.get(
          "python.dataScience.gatherSpecPath"
        );
        if (additionalSpecPath && (await pathExists(additionalSpecPath))) {
          ppa.addSpecFolder(additionalSpecPath);
        } else {
          log(
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
          log("Gather couldn't find any package specs.");
        }
      }
    } catch (ex) {
      log(`Gathering tools could't be activated. ${ex.message}`);
    }
  }
}

/**
 * Accumulator to concatenate cell slices for a sliced program, preserving cell structures.
 */
function concat(existingText: string, newText: ppatypes.CellSlice): string {
  // Include our cell marker so that cell slices are preserved
  return `${existingText}#%%\n${newText.textSliceLines}\n`;
}

/**
 * This is called to convert VS Code ICells to Gather ICells for logging.
 * @param cell A cell object conforming to the VS Code cell interface
 */
function convertVscToGatherCell(cell: IVscCell): ppatypes.Cell | undefined {
  // This should always be true since we only want to log code cells. Putting this here so types match for outputs property
  if (cell.data.cell_type === "code") {
    const result: ppatypes.Cell = {
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
