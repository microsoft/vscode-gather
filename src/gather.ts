import * as ppa from "@msrvida/python-program-analysis";
import {
  env,
  NotebookCell,
  NotebookCellData,
  NotebookCellKind,
  NotebookData,
  NotebookRange,
  ProgressLocation,
  UIKind,
  ViewColumn,
  window,
  workspace,
} from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { Constants, IGatherProvider, Telemetry } from "./types/types";
import {
  arePathsSame,
  concat,
  convertVscToGatherCell,
  countCells,
  generateCellsFromString,
  pathExists,
  splitLines,
  StopWatch,
} from "./helpers";
import * as util from "util";
import * as localize from "./localize";
import { sendTelemetryEvent } from "./telemetry";

export class GatherProvider implements IGatherProvider {
  private _executionSlicer: ppa.ExecutionLogSlicer<ppa.Cell> | undefined;
  private dataflowAnalyzer: ppa.DataflowAnalyzer | undefined;
  private initPromise: Promise<void>;
  private gatherTimer: StopWatch | undefined;
  private linesSubmitted: number = 0;
  private cellsSubmitted: number = 0;

  constructor(private readonly language: string) {
    this.initPromise = this.init();
  }

  public async getLogLength(): Promise<number | undefined> {
    await this.initPromise;

    if (this._executionSlicer) {
      return this._executionSlicer.executionLog.length;
    }
  }

  public async logExecution(vscCell: NotebookCell): Promise<void> {
    try {
      if (vscCell) {
        let code = "";
        try {
          if (vscCell.document) {
            code = vscCell.document.getText();
          } else {
            code = (vscCell as any).code as string;
          }

          // find lines in code
          const lineCount = code.split("\n").length;
          this.linesSubmitted += lineCount;
        } catch {
          this.linesSubmitted = -1;
        }
        this.cellsSubmitted += 1;
      }
      await this.initPromise;

      // If the execution count is 1, there was a kernel reset, so reset the log
      if (vscCell.executionSummary?.executionOrder === 1) {
        await this.resetLog();
      }

      // Assume Python until proposed api is out
      if (vscCell.document.languageId === Constants.PYTHON_LANGUAGE) {
        const gatherCell = convertVscToGatherCell(vscCell);

        if (gatherCell && this._executionSlicer) {
          this._executionSlicer.logExecution(gatherCell);
        }
      }
    } catch (e) {
      sendTelemetryEvent(Telemetry.GatherException, undefined, {
        exceptionType: "log",
      });
      window.showErrorMessage(
        localize.Common.loggingError() + vscCell.document.getText()
      );
      console.error(e);
      throw e;
    }
  }

  public async resetLog(): Promise<void> {
    try {
      this.linesSubmitted = 0;
      this.cellsSubmitted = 0;
      await this.initPromise;

      if (this.language === Constants.PYTHON_LANGUAGE) {
        if (this._executionSlicer) {
          this._executionSlicer.reset();
        }
      }
    } catch (e) {
      sendTelemetryEvent(Telemetry.GatherException, undefined, {
        exceptionType: "reset",
      });
      window.showErrorMessage(localize.Common.resetLog());
      console.error(e);
      throw e;
    }
  }

  /**
   * For a given code cell, returns a string representing a program containing all the code it depends on.
   */
  public async gatherCode(
    vscCell: NotebookCell,
    toScript: boolean = false
  ): Promise<void> {
    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: localize.Common.gathering(),
      },
      async () => {
        this.gatherTimer = new StopWatch();
        const gatheredCode = this.gatherCodeInternal(vscCell);
        if (gatheredCode.length === 0) {
          window.showInformationMessage(localize.Common.analysisEmpty());
          return;
        }

        const settings = workspace.getConfiguration();
        const gatherToScript: boolean =
          (settings.get(Constants.gatherToScriptSetting) as boolean) ||
          toScript;

        if (gatherToScript) {
          const filename = vscCell.notebook?.uri.toString() || "";
          await this.showFile(gatheredCode, filename);
          sendTelemetryEvent(
            Telemetry.GatherCompleted,
            this.gatherTimer?.elapsedTime,
            { result: "script" }
          );
        } else {
          await this.showNotebook(gatheredCode);
          sendTelemetryEvent(
            Telemetry.GatherCompleted,
            this.gatherTimer?.elapsedTime,
            { result: "notebook" }
          );
        }

        sendTelemetryEvent(Telemetry.GatherStats, undefined, {
          linesSubmitted: this.linesSubmitted,
          cellsSubmitted: this.cellsSubmitted,
          linesGathered: splitLines(gatheredCode.trim()).length,
          cellsGathered: countCells(splitLines(gatheredCode.trim())),
        });
      }
    );
  }

  private gatherCodeInternal(vscCell: NotebookCell): string {
    const settings = workspace.getConfiguration();
    const defaultCellMarker: string = settings
      ? (settings.get(Constants.defaultCellMarkerSetting) as string)
      : Constants.DefaultCodeCellMarker;
    const newline = "\n";

    try {
      // Assume Python until proposed api is out
      // if (vscCell.language === Constants.PYTHON_LANGUAGE) {
      if (!this._executionSlicer) {
        window.showErrorMessage(localize.Common.notAvailable());
        return "";
      }

      const gatherCell = convertVscToGatherCell(vscCell);
      if (!gatherCell) {
        window.showErrorMessage(localize.Common.errorTranslatingCell());
        return "";
      }

      // Call internal slice method
      const slice = this._executionSlicer.sliceLatestExecution(
        gatherCell.persistentId
      );

      if (slice) {
        const PpaResult = slice.cellSlices
          .reduce(concat, "")
          .replace(/#%%/g, defaultCellMarker)
          .trim();

        if (PpaResult.length === 0) {
          window.showErrorMessage(
            localize.Common.gatherError() + "\n" + localize.Common.PPAError()
          );
          return "";
        }

        return PpaResult;
      }

      sendTelemetryEvent(Telemetry.GatherException, undefined, {
        exceptionType: "gather",
      });
      return (
        defaultCellMarker +
        newline +
        localize.Common.gatherError() +
        newline +
        localize.Common.couldNotAnalyze()
      );
    } catch (e) {
      console.error(e);
      sendTelemetryEvent(Telemetry.GatherException, undefined, {
        exceptionType: "gather",
      });
      return (
        defaultCellMarker +
        newline +
        localize.Common.gatherError() +
        newline +
        (e as string)
      );
    }
  }

  public async gatherWithoutKernel(
    vscCell: NotebookCell,
    toScript: boolean
  ): Promise<void> {
    try {
      await this.initPromise;

      // Log all the cells up to vcsCell
      for (let index = 0; index < vscCell.notebook.getCells().length; index++) {
        const cell = vscCell.notebook.cellAt(index);
        await this.logExecution(cell);

        if (cell.index === vscCell.index) {
          break;
        }
      }

      // Gather normally
      await this.gatherCode(vscCell, toScript);
    } catch (e) {
      console.error(e);
    } finally {
      // End by reseting the log
      await this.resetLog();
    }
  }

  private async init(): Promise<void> {
    if (this.language === Constants.PYTHON_LANGUAGE) {
      try {
        if (ppa) {
          const settings = workspace.getConfiguration();
          let additionalSpecPath: string | undefined;
          if (settings) {
            additionalSpecPath = settings.get(Constants.gatherSpecPathSetting);
          }

          if (
            additionalSpecPath &&
            additionalSpecPath.length > 0 &&
            (await pathExists(additionalSpecPath))
          ) {
            const specsPaths = fs.readdirSync(additionalSpecPath);
            let specs: string[] = [];
            specsPaths.forEach((fileName) =>
              specs.push(
                fs
                  .readFileSync(path.resolve(additionalSpecPath!, fileName))
                  .toString()
              )
            );
            ppa.addSpecFolder(specs);
          } else {
            console.log(
              localize.Common.specFolderNotfound() + "\n" + additionalSpecPath
            );
          }

          // Only continue to initialize gather if we were successful in finding SOME specs.
          if (ppa.getSpecs()) {
            this.dataflowAnalyzer = new ppa.DataflowAnalyzer();
            this._executionSlicer = new ppa.ExecutionLogSlicer(
              this.dataflowAnalyzer
            );
          } else {
            console.error(localize.Common.couldNotFindSpecs());
          }
        }
      } catch (ex) {
        console.error(localize.Common.couldNotActivateTools, util.format(ex));
        throw ex;
      }
    }
  }

  private async showFile(gatheredCode: string, filename: string) {
    const settings = workspace.getConfiguration();
    const defaultCellMarker: string = settings
      ? (settings.get(Constants.defaultCellMarkerSetting) as string)
      : Constants.DefaultCodeCellMarker;

    if (gatheredCode) {
      // Remove all cell definitions and newlines
      const re = new RegExp(`^(${defaultCellMarker}.*|\\s*)\n`, "gm");
      gatheredCode = gatheredCode.replace(re, "");
    }

    const annotatedScript =
      env?.uiKind === UIKind?.Web
        ? `${localize.Common.gatheredScriptDescriptionWithoutSurvey()}${defaultCellMarker}\n${gatheredCode}`
        : `${localize.Common.gatheredScriptDescription()}${defaultCellMarker}\n${gatheredCode}`;

    // Don't want to open the gathered code on top of the interactive window
    let viewColumn: ViewColumn | undefined;
    const fileNameMatch = window.visibleTextEditors.filter((textEditor) =>
      arePathsSame(textEditor.document.fileName, filename)
    );
    const definedVisibleEditors = window.visibleTextEditors.filter(
      (textEditor) => textEditor.viewColumn !== undefined
    );
    if (window.visibleTextEditors.length > 0 && fileNameMatch.length > 0) {
      // Original file is visible
      viewColumn = fileNameMatch[0].viewColumn;
    } else if (
      window.visibleTextEditors.length > 0 &&
      definedVisibleEditors.length > 0
    ) {
      // There is a visible text editor, just not the original file. Make sure viewColumn isn't undefined
      viewColumn = definedVisibleEditors[0].viewColumn;
    } else {
      // Only one panel open and interactive window is occupying it, or original file is open but hidden
      viewColumn = ViewColumn.Beside;
    }

    const textDoc = await workspace.openTextDocument({
      language: Constants.PYTHON_LANGUAGE,
      content: annotatedScript,
    });
    await window.showTextDocument(textDoc, viewColumn, true);
  }

  private async showNotebook(gatheredCode: string) {
    const cells = generateCellsFromString(gatheredCode);

    const nbCells = cells.map((cell) => {
      return new NotebookCellData(
        NotebookCellKind.Code,
        cell.source.join("\r\n"),
        Constants.PYTHON_LANGUAGE
      );
    });

    let finalCells: NotebookCellData[] = [
      new NotebookCellData(
        NotebookCellKind.Markup,
        env.uiKind === UIKind?.Web
          ? localize.Common.gatheredNotebookDescriptionInMarkdownWithoutSurvey()
          : localize.Common.gatheredNotebookDescriptionInMarkdown(),
        "Markdown"
      ),
    ];
    finalCells.push(...nbCells);

    const doc = await workspace.openNotebookDocument(
      "jupyter-notebook",
      new NotebookData(finalCells)
    );
    await window.showNotebookDocument(doc, {
      viewColumn: 1,
      preserveFocus: true,
    });
  }

  public async smartSelect(vscCell: NotebookCell): Promise<void> {
    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: localize.Common.smartSelecting(),
      },
      async () => {
        try {
          const gatheredCode = this.gatherCodeInternal(vscCell);
          if (gatheredCode.length === 0) {
            window.showErrorMessage(
              localize.Common.gatherError() + "\n" + localize.Common.PPAError()
            );
            return;
          }
          if (gatheredCode.includes(localize.Common.gatherError())) {
            window.showErrorMessage(localize.Common.couldNotAnalyze());
            return;
          }
          let cells = generateCellsFromString(gatheredCode);

          if (window.activeNotebookEditor) {
            const ranges: NotebookRange[] = [];

            // Map gathered cells to notebook cells
            cells.forEach((gatheredCell) => {
              const match = window.activeNotebookEditor?.notebook
                .getCells()
                .find((notebookCell) => {
                  if (
                    notebookCell.document
                      .getText()
                      .includes(gatheredCell.source.join("\n"))
                  ) {
                    return notebookCell;
                  }
                });
              if (match) {
                ranges.push(new NotebookRange(match.index, match.index + 1));
              }
            });

            window.showNotebookDocument(window.activeNotebookEditor.notebook, {
              selections: ranges,
            });
          }

          return;
        } catch (e) {
          window.showErrorMessage(localize.Common.gatherError());
          console.error(e);
        }
      }
    );
  }

  public async smartSelectWithoutKernel(vscCell: NotebookCell): Promise<void> {
    try {
      await this.initPromise;

      // Log all the cells up to vcsCell
      for (let index = 0; index < vscCell.notebook.getCells().length; index++) {
        const cell = vscCell.notebook.cellAt(index);
        await this.logExecution(cell);

        if (cell.index === vscCell.index) {
          break;
        }
      }

      // Smart select normally
      await this.smartSelect(vscCell);
    } catch (e) {
      console.error(e);
    } finally {
      // End by reseting the log
      await this.resetLog();
    }
  }
}
