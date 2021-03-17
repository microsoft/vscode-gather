import * as ppa from "@msrvida/python-program-analysis";
import * as vscode from "vscode";
import * as path from 'path';
import * as fs from 'fs-extra';
import { Constants, IGatherProvider, SimpleCell, Telemetry } from "./types/types";
import { arePathsSame, concat, convertVscToGatherCell, countCells, createNotebookContent, generateCellsFromString, pathExists, splitLines, StopWatch } from "./helpers";
import * as util from "util";
import * as localize from './localize';
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

  public async logExecution(vscCell: vscode.NotebookCell): Promise<void> {
    try {
      if (vscCell) {
        let code = '';
        try {
          if (vscCell.document) {
            code = vscCell.document.getText();
          } else {
            code = (vscCell as any).code as string;
          }

          // find lines in code
          const lineCount = code.split('\n').length;
          this.linesSubmitted += lineCount;
        } catch {
          this.linesSubmitted = -1;
        }
        this.cellsSubmitted += 1;
      }
      await this.initPromise;

      // Assume Python until proposed api is out
      // if (vscCell.language === Constants.PYTHON_LANGUAGE) {
      const gatherCell = convertVscToGatherCell(vscCell);

      if (gatherCell && this._executionSlicer) {
        this._executionSlicer.logExecution(gatherCell);
      }
      // }

      // if (vscCell.language === 'C#') {
      //   C# work
      // }
    } catch (e) {
      sendTelemetryEvent(Telemetry.GatherException, undefined, { exceptionType: 'log' });
      vscode.window.showErrorMessage(localize.Common.loggingError() + vscCell.document.getText());
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
      
      // if (this.language === C#) {
      //   C# work
      // }
    } catch (e) {
      sendTelemetryEvent(Telemetry.GatherException, undefined, { exceptionType: 'reset' });
      vscode.window.showErrorMessage(localize.Common.resetLog());
      console.error(e);
      throw e;
    }
  }

  /**
   * For a given code cell, returns a string representing a program containing all the code it depends on.
   */
  public async gatherCode(vscCell: vscode.NotebookCell, toScript: boolean = false): Promise<void> {
    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: localize.Common.gathering() }, 
      async () => {
        this.gatherTimer = new StopWatch();
        const gatheredCode = this.gatherCodeInternal(vscCell);
        if (gatheredCode.length === 0) {
          return;
        }

        const settings = vscode.workspace.getConfiguration();
        const gatherToScript: boolean = settings.get(Constants.gatherToScriptSetting) as boolean || toScript;

        if (gatherToScript) {
          const filename = vscCell.notebook?.fileName || '';
          await this.showFile(gatheredCode, filename);
          sendTelemetryEvent(Telemetry.GatherCompleted, this.gatherTimer?.elapsedTime, { result: 'script' });
        } else {
          await this.showNotebook(gatheredCode);
          sendTelemetryEvent(Telemetry.GatherCompleted, this.gatherTimer?.elapsedTime, { result: 'notebook' });
        }

        sendTelemetryEvent(Telemetry.GatherStats, undefined, {
          linesSubmitted: this.linesSubmitted,
          cellsSubmitted: this.cellsSubmitted,
          linesGathered: splitLines(gatheredCode.trim()).length,
          cellsGathered: countCells(splitLines(gatheredCode.trim()))
        });
      }
    );      
  }

  private gatherCodeInternal(vscCell: vscode.NotebookCell): string {
    const settings = vscode.workspace.getConfiguration();
    const defaultCellMarker: string = settings ?
      settings.get(Constants.defaultCellMarkerSetting) as string :
      Constants.DefaultCodeCellMarker;
    const newline = '\n';

    try {
      // Assume Python until proposed api is out
      // if (vscCell.language === Constants.PYTHON_LANGUAGE) {
        if (!this._executionSlicer) {
          vscode.window.showErrorMessage(localize.Common.notAvailable());
          return "";
        }

        const gatherCell = convertVscToGatherCell(vscCell);
        if (!gatherCell) {
          vscode.window.showErrorMessage(localize.Common.errorTranslatingCell());
          return "";
        }

        // Call internal slice method
        const slice = this._executionSlicer.sliceLatestExecution(gatherCell.persistentId);
        const PpaResult = slice.cellSlices
          .reduce(concat, "")
          .replace(/#%%/g, defaultCellMarker)
          .trim();

        if (PpaResult.length === 0) {
          vscode.window.showErrorMessage(localize.Common.gatherError()  + '\n' + localize.Common.PPAError());
          return "";
        }

        return PpaResult;
      // }

      // if (vscCell.language === 'C#') {
      //   C# work
      // }

      // return defaultCellMarker + localize.Common.notAvailable() + ' in ' + vscCell.language;
    } catch (e) {
      // Cannot read property 'cellSlices' of undefined
      if ((e.message as string).includes('cellSlices') && e.message.includes('undefined')) {
        vscode.window.showInformationMessage(localize.Common.runCells());
        return "";
      }
      vscode.window.showErrorMessage(localize.Common.gatherError());
      console.error(e);
      sendTelemetryEvent(Telemetry.GatherException, undefined, { exceptionType: 'gather' });
      return defaultCellMarker + newline + localize.Common.gatherError() + newline + (e as string);
    }
  }

  private async init(): Promise<void> {
    if (this.language === Constants.PYTHON_LANGUAGE) {
      try {
        if (ppa) {
          const settings = vscode.workspace.getConfiguration();
          let additionalSpecPath: string | undefined;
          if (settings) {
            additionalSpecPath = settings.get(Constants.gatherSpecPathSetting);
          }
  
          if (additionalSpecPath && additionalSpecPath.length > 0 && (await pathExists(additionalSpecPath))) {
            const specsPaths = fs.readdirSync(additionalSpecPath);
            let specs: string[] = [];
            specsPaths.forEach(fileName => specs.push(fs.readFileSync(path.resolve(additionalSpecPath!, fileName)).toString()));
            ppa.addSpecFolder(specs);
          } else {
            console.log(localize.Common.specFolderNotfound() + '\n' + additionalSpecPath);
          }
  
          // Only continue to initialize gather if we were successful in finding SOME specs.
          if (ppa.getSpecs()) {
            this.dataflowAnalyzer = new ppa.DataflowAnalyzer();
            this._executionSlicer = new ppa.ExecutionLogSlicer(this.dataflowAnalyzer);
          } else {
            console.error(localize.Common.couldNotFindSpecs());
          }
        }
      } catch (ex) {
        console.error(localize.Common.couldNotActivateTools, util.format(ex));
        throw ex;
      }
    }

    // if (this.language === 'C#') {
    //   C# work
    // }
  }

  private async showFile(gatheredCode: string, filename: string) {
    const settings = vscode.workspace.getConfiguration();
    const defaultCellMarker: string = settings ?
      settings.get(Constants.defaultCellMarkerSetting) as string :
      Constants.DefaultCodeCellMarker;

    if (gatheredCode) {
      // Remove all cell definitions and newlines
      const re = new RegExp(`^(${defaultCellMarker}.*|\\s*)\n`, 'gm');
      gatheredCode = gatheredCode.replace(re, '');
    }

    const annotatedScript = vscode.env?.uiKind === vscode.UIKind?.Web
      ? `${localize.Common.gatheredScriptDescriptionWithoutSurvey()}${defaultCellMarker}\n${gatheredCode}`
      : `${localize.Common.gatheredScriptDescription()}${defaultCellMarker}\n${gatheredCode}`;

    // Don't want to open the gathered code on top of the interactive window
    let viewColumn: vscode.ViewColumn | undefined;
    const fileNameMatch = vscode.window.visibleTextEditors.filter((textEditor) =>
      arePathsSame(textEditor.document.fileName, filename)
    );
    const definedVisibleEditors = vscode.window.visibleTextEditors.filter(
        (textEditor) => textEditor.viewColumn !== undefined
    );
    if (vscode.window.visibleTextEditors.length > 0 && fileNameMatch.length > 0) {
        // Original file is visible
        viewColumn = fileNameMatch[0].viewColumn;
    } else if (vscode.window.visibleTextEditors.length > 0 && definedVisibleEditors.length > 0) {
        // There is a visible text editor, just not the original file. Make sure viewColumn isn't undefined
        viewColumn = definedVisibleEditors[0].viewColumn;
    } else {
        // Only one panel open and interactive window is occupying it, or original file is open but hidden
        viewColumn = vscode.ViewColumn.Beside;
    }

    const textDoc = await vscode.workspace.openTextDocument({ language: Constants.PYTHON_LANGUAGE, content: annotatedScript });
    await vscode.window.showTextDocument(textDoc, viewColumn, true);
  }

  private async showNotebook(gatheredCode: string) {
    let cells: SimpleCell[] = [
      {
        source: vscode.env.uiKind === vscode.UIKind?.Web
          ? [localize.Common.gatheredNotebookDescriptionInMarkdownWithoutSurvey()]
          : [localize.Common.gatheredNotebookDescriptionInMarkdown()],
        type: 'markdown'
      }
    ];
    cells = cells.concat(generateCellsFromString(gatheredCode));
    const notebook = createNotebookContent(cells);

    await vscode.commands.executeCommand(Constants.openNotebookCommand, undefined, notebook);
  }
}
